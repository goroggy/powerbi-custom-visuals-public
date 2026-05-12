"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DataView = powerbi.DataView;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewObjects = powerbi.DataViewObjects;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import FilterAction = powerbi.FilterAction;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;

type RoleName = "filterKey" | "displayColumn" | "sortKey";

interface DisplayColumn {
  index: number;
  title: string;
  track: string;
}

interface SlicerRow {
  key: string;
  cells: string[];
  sortKey: string;
  searchText: string;
}

interface FilterTarget {
  table: string;
  column: string;
}

interface BasicInFilter {
  $schema: string;
  target: FilterTarget;
  operator: "In";
  values: string[];
  filterType: number;
}

interface VisualSettings {
  fontFamily: string;
  fontSize: number;
  headerFontSize: number;
  rowMinHeight: number;
}

export class Visual implements IVisual {
  private readonly host: IVisualHost;
  private readonly root: HTMLDivElement;
  private readonly searchInput: HTMLInputElement;
  private readonly clearButton: HTMLButtonElement;
  private readonly countLabel: HTMLSpanElement;
  private readonly header: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly selectedKeys = new Set<string>();

  private rows: SlicerRow[] = [];
  private displayColumns: DisplayColumn[] = [];
  private filterColumn: DataViewMetadataColumn | undefined;
  private sortColumnIndex: number | undefined;
  private sortDescending = false;
  private searchText = "";
  private settings: VisualSettings = {
    fontFamily: "Segoe UI",
    fontSize: 14,
    headerFontSize: 13,
    rowMinHeight: 32
  };

  constructor(options: VisualConstructorOptions) {
    this.host = options.host;
    this.root = document.createElement("div");
    this.root.className = "publication-slicer-table";
    options.element.appendChild(this.root);

    const toolbar = document.createElement("div");
    toolbar.className = "pst-toolbar";

    this.searchInput = document.createElement("input");
    this.searchInput.className = "pst-search";
    this.searchInput.type = "search";
    this.searchInput.placeholder = "Search";
    this.searchInput.addEventListener("input", () => {
      this.searchText = this.searchInput.value.trim().toLocaleLowerCase();
      this.renderRows();
    });
    toolbar.appendChild(this.searchInput);

    this.clearButton = document.createElement("button");
    this.clearButton.className = "pst-button";
    this.clearButton.type = "button";
    this.clearButton.textContent = "Clear";
    this.clearButton.addEventListener("click", () => {
      this.selectedKeys.clear();
      this.applySelectionFilter();
      this.renderRows();
    });
    toolbar.appendChild(this.clearButton);

    this.countLabel = document.createElement("span");
    this.countLabel.className = "pst-count";
    toolbar.appendChild(this.countLabel);
    this.root.appendChild(toolbar);

    const grid = document.createElement("div");
    grid.className = "pst-grid";

    this.header = document.createElement("div");
    this.header.className = "pst-header";
    grid.appendChild(this.header);

    this.body = document.createElement("div");
    this.body.className = "pst-body";
    grid.appendChild(this.body);
    this.root.appendChild(grid);
  }

  public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews && options.dataViews[0];
    this.settings = this.readSettings(dataView);
    this.applySettings();
    this.rows = this.readRows(dataView);
    this.syncSelectionFromFilters(options.jsonFilters || []);
    this.renderHeader();
    this.renderRows();
  }

  public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
    if (options.objectName !== "style") {
      return [];
    }

    return [
      {
        objectName: "style",
        selector: null as any,
        properties: {
          fontFamily: this.settings.fontFamily,
          fontSize: this.settings.fontSize,
          headerFontSize: this.settings.headerFontSize,
          rowMinHeight: this.settings.rowMinHeight
        }
      }
    ];
  }

  public getFormattingModel(): powerbi.visuals.FormattingModel {
    return {
      cards: [
        {
          uid: "styleCard",
          displayName: "Style",
          groups: [
            {
              uid: "styleGroup",
              displayName: "Style",
              slices: [
                this.fontFamilySlice("fontFamily", "Font family", this.settings.fontFamily),
                this.numericSlice("fontSize", "Font size", this.settings.fontSize),
                this.numericSlice("headerFontSize", "Header font size", this.settings.headerFontSize),
                this.numericSlice("rowMinHeight", "Row min height", this.settings.rowMinHeight)
              ]
            }
          ],
          revertToDefaultDescriptors: [
            { objectName: "style", propertyName: "fontFamily" },
            { objectName: "style", propertyName: "fontSize" },
            { objectName: "style", propertyName: "headerFontSize" },
            { objectName: "style", propertyName: "rowMinHeight" }
          ]
        }
      ]
    };
  }

  private readSettings(dataView?: DataView): VisualSettings {
    const objects = dataView && dataView.metadata && dataView.metadata.objects;
    return {
      fontFamily: this.objectString(objects, "style", "fontFamily", "Segoe UI"),
      fontSize: this.objectNumber(objects, "style", "fontSize", 14),
      headerFontSize: this.objectNumber(objects, "style", "headerFontSize", 13),
      rowMinHeight: this.objectNumber(objects, "style", "rowMinHeight", 32)
    };
  }

  private objectNumber(
    objects: DataViewObjects | undefined,
    objectName: string,
    propertyName: string,
    defaultValue: number
  ): number {
    const value = objects && objects[objectName] && objects[objectName][propertyName];
    return typeof value === "number" && isFinite(value) ? value : defaultValue;
  }

  private objectString(
    objects: DataViewObjects | undefined,
    objectName: string,
    propertyName: string,
    defaultValue: string
  ): string {
    const value = objects && objects[objectName] && objects[objectName][propertyName] as any;
    return typeof value === "string" && value.trim() ? value : defaultValue;
  }

  private applySettings(): void {
    this.root.style.setProperty("--pst-font-family", this.settings.fontFamily);
    this.root.style.setProperty("--pst-font-size", `${this.settings.fontSize}px`);
    this.root.style.setProperty("--pst-header-font-size", `${this.settings.headerFontSize}px`);
    this.root.style.setProperty("--pst-row-min-height", `${this.settings.rowMinHeight}px`);
  }

  private numericSlice(name: string, displayName: string, value: number): powerbi.visuals.FormattingSlice {
    return {
      uid: `style_${name}`,
      displayName,
      control: {
        type: "NumUpDown",
        properties: {
          descriptor: {
            objectName: "style",
            propertyName: name
          },
          value
        }
      }
    } as powerbi.visuals.FormattingSlice;
  }

  private fontFamilySlice(name: string, displayName: string, value: string): powerbi.visuals.FormattingSlice {
    return {
      uid: `style_${name}`,
      displayName,
      control: {
        type: "FontPicker",
        properties: {
          descriptor: {
            objectName: "style",
            propertyName: name
          },
          value
        }
      }
    } as powerbi.visuals.FormattingSlice;
  }

  private readRows(dataView?: DataView): SlicerRow[] {
    const table = dataView && dataView.table;
    if (!table || !table.columns || !table.rows) {
      this.filterColumn = undefined;
      this.displayColumns = [];
      return [];
    }

    const columns = table.columns;
    const keyIndex = this.roleIndex(columns, "filterKey");
    if (keyIndex < 0) {
      this.filterColumn = undefined;
      this.displayColumns = [];
      return [];
    }

    this.filterColumn = columns[keyIndex];
    const sortKeyIndex = this.roleIndex(columns, "sortKey");
    this.displayColumns = this.roleIndexes(columns, "displayColumn").map(index => ({
      index,
      title: this.columnTitle(columns[index]),
      track: this.columnTrack(columns[index])
    }));

    const rows: SlicerRow[] = [];
    for (const row of table.rows) {
      const key = this.text(row[keyIndex]);
      if (!key) {
        continue;
      }

      const cells = this.displayColumns.map(column => this.text(row[column.index]));
      const sortKey = sortKeyIndex >= 0 ? this.text(row[sortKeyIndex]) : "";
      const searchText = `${key} ${cells.join(" ")}`.toLocaleLowerCase();
      rows.push({ key, cells, sortKey, searchText });
    }

    return rows;
  }

  private roleIndex(columns: DataViewMetadataColumn[], role: RoleName): number {
    return columns.findIndex(column => !!(column.roles && column.roles[role]));
  }

  private roleIndexes(columns: DataViewMetadataColumn[], role: RoleName): number[] {
    const matches: Array<{ columnIndex: number; projectionIndex: number }> = [];
    columns.forEach((column, index) => {
      if (column.roles && column.roles[role]) {
        matches.push({
          columnIndex: index,
          projectionIndex: typeof column.index === "number" ? column.index : index
        });
      }
    });
    matches.sort((left, right) => left.projectionIndex - right.projectionIndex);
    return matches.map(match => match.columnIndex);
  }

  private columnTitle(column: DataViewMetadataColumn): string {
    return column.displayName || column.queryName || "";
  }

  private columnTrack(column: DataViewMetadataColumn): string {
    const name = `${column.displayName || ""} ${column.queryName || ""}`.toLocaleLowerCase();
    if (name.includes("title") || name.includes("abstract")) {
      return "minmax(240px, 4fr)";
    }
    if (name.includes("year")) {
      return "52px";
    }
    if (name.includes("lang")) {
      return "42px";
    }
    if (name.includes("source")) {
      return "70px";
    }
    if (name.includes("compound") || name.includes("target")) {
      return "minmax(120px, 1.4fr)";
    }
    return "minmax(90px, 1fr)";
  }

  private text(value: PrimitiveValue): string {
    return value === null || value === undefined ? "" : String(value);
  }

  private renderHeader(): void {
    this.header.replaceChildren();
    this.header.style.gridTemplateColumns = this.gridTemplate();
    this.header.appendChild(this.headerCell(""));
    this.displayColumns.forEach((column, index) => {
      this.header.appendChild(this.headerCell(column.title, index));
    });
  }

  private headerCell(text: string, sortIndex?: number): HTMLDivElement {
    const cell = document.createElement("div");
    cell.className = "pst-header-cell";
    const arrow = sortIndex === this.sortColumnIndex ? (this.sortDescending ? " ▼" : " ▲") : "";
    cell.textContent = `${text}${arrow}`;
    cell.title = text;
    if (sortIndex !== undefined) {
      cell.addEventListener("click", () => {
        if (this.sortColumnIndex === sortIndex) {
          this.sortDescending = !this.sortDescending;
        } else {
          this.sortColumnIndex = sortIndex;
          this.sortDescending = false;
        }
        this.renderHeader();
        this.renderRows();
      });
    }
    return cell;
  }

  private renderRows(): void {
    this.body.replaceChildren();

    if (!this.filterColumn) {
      this.renderEmpty("Add a field to Filter key.");
      return;
    }

    if (this.displayColumns.length === 0) {
      this.renderEmpty("Add fields to Display columns.");
      return;
    }

    const visibleRows = this.sortedRows(this.filteredRows());
    this.countLabel.textContent = `${this.selectedKeys.size}/${this.distinctKeyCount(visibleRows)}`;

    if (visibleRows.length === 0) {
      this.renderEmpty("No rows");
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const row of visibleRows) {
      fragment.appendChild(this.renderRow(row));
    }
    this.body.appendChild(fragment);
  }

  private filteredRows(): SlicerRow[] {
    if (!this.searchText) {
      return this.rows;
    }
    return this.rows.filter(row => row.searchText.includes(this.searchText));
  }

  private sortedRows(rows: SlicerRow[]): SlicerRow[] {
    const copy = rows.slice();
    if (this.sortColumnIndex === undefined) {
      copy.sort((a, b) => this.compare(a.sortKey || a.key, b.sortKey || b.key));
      return copy;
    }

    const sortIndex = this.sortColumnIndex;
    copy.sort((a, b) => {
      const result = this.compare(a.cells[sortIndex] || "", b.cells[sortIndex] || "");
      return this.sortDescending ? -result : result;
    });
    return copy;
  }

  private compare(left: string, right: string): number {
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  }

  private distinctKeyCount(rows: SlicerRow[]): number {
    const keys = new Set<string>();
    rows.forEach(row => keys.add(row.key));
    return keys.size;
  }

  private renderRow(row: SlicerRow): HTMLDivElement {
    const rowElement = document.createElement("div");
    rowElement.className = "pst-row";
    rowElement.style.gridTemplateColumns = this.gridTemplate();
    if (this.selectedKeys.has(row.key)) {
      rowElement.classList.add("is-selected");
    }

    const checkCell = document.createElement("div");
    checkCell.className = "pst-check";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.selectedKeys.has(row.key);
    checkbox.addEventListener("click", event => {
      event.stopPropagation();
      this.toggleRow(row.key);
    });
    checkCell.appendChild(checkbox);
    rowElement.appendChild(checkCell);

    row.cells.forEach(text => rowElement.appendChild(this.cell(text)));
    rowElement.addEventListener("click", () => this.toggleRow(row.key));
    return rowElement;
  }

  private cell(text: string): HTMLDivElement {
    const cell = document.createElement("div");
    cell.className = "pst-cell";
    cell.textContent = text;
    cell.title = text;
    return cell;
  }

  private renderEmpty(message: string): void {
    this.countLabel.textContent = "";
    const empty = document.createElement("div");
    empty.className = "pst-empty";
    empty.textContent = message;
    this.body.appendChild(empty);
  }

  private gridTemplate(): string {
    return `24px ${this.displayColumns.map(column => column.track).join(" ")}`;
  }

  private toggleRow(key: string): void {
    if (this.selectedKeys.has(key)) {
      this.selectedKeys.delete(key);
    } else {
      this.selectedKeys.add(key);
    }
    this.applySelectionFilter();
    this.renderRows();
  }

  private applySelectionFilter(): void {
    const target = this.currentTarget();
    if (!target) {
      return;
    }

    if (this.selectedKeys.size === 0) {
      this.host.applyJsonFilter(null, "general", "filter", FilterAction.remove);
      return;
    }

    const filter: BasicInFilter = {
      $schema: "https://powerbi.com/product/schema#basic",
      target,
      operator: "In",
      values: Array.from(this.selectedKeys),
      filterType: 1
    };
    this.host.applyJsonFilter(filter, "general", "filter", FilterAction.merge);
  }

  private currentTarget(): FilterTarget | undefined {
    const queryName = this.filterColumn && this.filterColumn.queryName;
    if (!queryName) {
      return undefined;
    }
    const separatorIndex = queryName.indexOf(".");
    if (separatorIndex < 1 || separatorIndex === queryName.length - 1) {
      return undefined;
    }
    return {
      table: queryName.substring(0, separatorIndex),
      column: queryName.substring(separatorIndex + 1)
    };
  }

  private syncSelectionFromFilters(filters: powerbi.IFilter[]): void {
    const target = this.currentTarget();
    if (!target) {
      this.selectedKeys.clear();
      return;
    }

    const selected = new Set<string>();
    for (const filter of filters as any[]) {
      if (!filter || filter.operator !== "In" || !Array.isArray(filter.values)) {
        continue;
      }
      const filterTarget = filter.target;
      if (filterTarget && filterTarget.table === target.table && filterTarget.column === target.column) {
        for (const value of filter.values) {
          selected.add(String(value));
        }
      }
    }
    this.selectedKeys.clear();
    selected.forEach(value => this.selectedKeys.add(value));
  }
}
