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

interface AdvancedContainsFilter {
  $schema: string;
  target: FilterTarget;
  logicalOperator: "And";
  conditions: Array<{
    operator: "Contains";
    value: string;
  }>;
  filterType: number;
}

interface SlicerItem {
  value: string;
  count: number;
  searchText: string;
}

interface VisualSettings {
  fontFamily: string;
  fontSize: number;
  rowHeight: number;
  allowMultiSelect: boolean;
  applySearchWhileTyping: boolean;
  showCounts: boolean;
  showSearchBar: boolean;
  searchPlaceholder: string;
}

const CLEAR_CUSTOM_SLICERS_EVENT = "pbiCustomVisuals:clearSlicers";
const CLEAR_CUSTOM_SLICERS_STORAGE_KEY = "pbiCustomVisuals.clearSlicers";

export class Visual implements IVisual {
  private readonly host: IVisualHost;
  private readonly root: HTMLDivElement;
  private readonly searchInput: HTMLInputElement;
  private readonly searchButton: HTMLButtonElement;
  private readonly clearSearchButton: HTMLButtonElement;
  private readonly clearSelectionButton: HTMLButtonElement;
  private readonly countLabel: HTMLSpanElement;
  private readonly list: HTMLDivElement;
  private readonly selectedValues = new Set<string>();

  private items: SlicerItem[] = [];
  private categoryColumn: DataViewMetadataColumn | undefined;
  private targetKey = "";
  private searchText = "";
  private searchTimer: number | undefined;
  private readonly globalClearHandler = () => this.clearAllState();
  private readonly storageClearHandler = (event: StorageEvent) => {
    if (event.key === CLEAR_CUSTOM_SLICERS_STORAGE_KEY) {
      this.clearAllState();
    }
  };
  private settings: VisualSettings = {
    fontFamily: "Segoe UI",
    fontSize: 13,
    rowHeight: 28,
    allowMultiSelect: true,
    applySearchWhileTyping: true,
    showCounts: false,
    showSearchBar: true,
    searchPlaceholder: "Search"
  };

  constructor(options: VisualConstructorOptions) {
    this.host = options.host;
    this.root = document.createElement("div");
    this.root.className = "quick-search-slicer";
    options.element.appendChild(this.root);

    const searchBar = document.createElement("div");
    searchBar.className = "qss-searchbar";

    this.searchInput = document.createElement("input");
    this.searchInput.className = "qss-search";
    this.searchInput.type = "search";
    this.searchInput.addEventListener("input", () => this.onSearchInput());
    this.searchInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        this.applySearchFilter();
      }
    });
    searchBar.appendChild(this.searchInput);

    this.searchButton = document.createElement("button");
    this.searchButton.className = "qss-icon-button";
    this.searchButton.type = "button";
    this.searchButton.textContent = "↵";
    this.searchButton.title = "Apply search";
    this.searchButton.setAttribute("aria-label", "Apply search");
    this.searchButton.addEventListener("click", () => this.applySearchFilter());
    searchBar.appendChild(this.searchButton);

    this.clearSearchButton = document.createElement("button");
    this.clearSearchButton.className = "qss-icon-button";
    this.clearSearchButton.type = "button";
    this.clearSearchButton.textContent = "×";
    this.clearSearchButton.title = "Clear search";
    this.clearSearchButton.setAttribute("aria-label", "Clear search");
    this.clearSearchButton.addEventListener("click", () => this.clearSearch());
    searchBar.appendChild(this.clearSearchButton);

    this.clearSelectionButton = document.createElement("button");
    this.clearSelectionButton.className = "qss-clear-selection";
    this.clearSelectionButton.type = "button";
    this.clearSelectionButton.textContent = "All";
    this.clearSelectionButton.title = "Clear selection";
    this.clearSelectionButton.setAttribute("aria-label", "Clear selection");
    this.clearSelectionButton.addEventListener("click", () => this.clearSelection());
    searchBar.appendChild(this.clearSelectionButton);

    this.countLabel = document.createElement("span");
    this.countLabel.className = "qss-count";
    searchBar.appendChild(this.countLabel);

    this.root.appendChild(searchBar);

    this.list = document.createElement("div");
    this.list.className = "qss-list";
    this.root.appendChild(this.list);

    window.addEventListener(CLEAR_CUSTOM_SLICERS_EVENT, this.globalClearHandler);
    window.addEventListener("storage", this.storageClearHandler);
  }

  public destroy(): void {
    window.removeEventListener(CLEAR_CUSTOM_SLICERS_EVENT, this.globalClearHandler);
    window.removeEventListener("storage", this.storageClearHandler);
  }

  public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews && options.dataViews[0];
    this.settings = this.readSettings(dataView);
    this.applySettings();
    this.items = this.readItems(dataView);
    this.resetStateIfTargetChanged();
    this.syncFromFilters(options.jsonFilters || []);
    this.searchInput.value = this.searchText;
    this.render();
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
          rowHeight: this.settings.rowHeight,
          allowMultiSelect: this.settings.allowMultiSelect,
          applySearchWhileTyping: this.settings.applySearchWhileTyping,
          showCounts: this.settings.showCounts,
          showSearchBar: this.settings.showSearchBar,
          searchPlaceholder: this.settings.searchPlaceholder
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
                this.numericSlice("rowHeight", "Row height", this.settings.rowHeight),
                this.toggleSlice("allowMultiSelect", "Allow multi-select", this.settings.allowMultiSelect),
                this.toggleSlice("applySearchWhileTyping", "Search while typing", this.settings.applySearchWhileTyping),
                this.toggleSlice("showCounts", "Show counts", this.settings.showCounts),
                this.toggleSlice("showSearchBar", "Show search bar", this.settings.showSearchBar),
                this.textSlice("searchPlaceholder", "Search placeholder", this.settings.searchPlaceholder)
              ]
            }
          ],
          revertToDefaultDescriptors: [
            { objectName: "style", propertyName: "fontFamily" },
            { objectName: "style", propertyName: "fontSize" },
            { objectName: "style", propertyName: "rowHeight" },
            { objectName: "style", propertyName: "allowMultiSelect" },
            { objectName: "style", propertyName: "applySearchWhileTyping" },
            { objectName: "style", propertyName: "showCounts" },
            { objectName: "style", propertyName: "showSearchBar" },
            { objectName: "style", propertyName: "searchPlaceholder" }
          ]
        }
      ]
    };
  }

  private readSettings(dataView?: DataView): VisualSettings {
    const objects = dataView && dataView.metadata && dataView.metadata.objects;
    return {
      fontFamily: this.objectString(objects, "style", "fontFamily", "Segoe UI"),
      fontSize: this.objectNumber(objects, "style", "fontSize", 13),
      rowHeight: this.objectNumber(objects, "style", "rowHeight", 28),
      allowMultiSelect: this.objectBool(objects, "style", "allowMultiSelect", true),
      applySearchWhileTyping: this.objectBool(objects, "style", "applySearchWhileTyping", true),
      showCounts: this.objectBool(objects, "style", "showCounts", false),
      showSearchBar: this.objectBool(objects, "style", "showSearchBar", true),
      searchPlaceholder: this.objectString(objects, "style", "searchPlaceholder", "Search")
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

  private objectBool(
    objects: DataViewObjects | undefined,
    objectName: string,
    propertyName: string,
    defaultValue: boolean
  ): boolean {
    const value = objects && objects[objectName] && objects[objectName][propertyName] as any;
    return typeof value === "boolean" ? value : defaultValue;
  }

  private applySettings(): void {
    this.root.style.setProperty("--qss-font-family", this.settings.fontFamily);
    this.root.style.setProperty("--qss-font-size", `${this.settings.fontSize}px`);
    this.root.style.setProperty("--qss-row-height", `${this.settings.rowHeight}px`);
    this.root.classList.toggle("qss-hide-searchbar", !this.settings.showSearchBar);
    this.searchInput.placeholder = this.settings.searchPlaceholder;
  }

  private numericSlice(name: string, displayName: string, value: number): powerbi.visuals.FormattingSlice {
    return {
      uid: `style_${name}`,
      displayName,
      control: {
        type: "NumUpDown",
        properties: {
          descriptor: { objectName: "style", propertyName: name },
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
          descriptor: { objectName: "style", propertyName: name },
          value
        }
      }
    } as powerbi.visuals.FormattingSlice;
  }

  private toggleSlice(name: string, displayName: string, value: boolean): powerbi.visuals.FormattingSlice {
    return {
      uid: `style_${name}`,
      displayName,
      control: {
        type: "ToggleSwitch",
        properties: {
          descriptor: { objectName: "style", propertyName: name },
          value
        }
      }
    } as powerbi.visuals.FormattingSlice;
  }

  private textSlice(name: string, displayName: string, value: string): powerbi.visuals.FormattingSlice {
    return {
      uid: `style_${name}`,
      displayName,
      control: {
        type: "TextInput",
        properties: {
          descriptor: { objectName: "style", propertyName: name },
          value
        }
      }
    } as powerbi.visuals.FormattingSlice;
  }

  private readItems(dataView?: DataView): SlicerItem[] {
    const categorical = dataView && dataView.categorical;
    const category = categorical && categorical.categories && categorical.categories[0];
    if (!category || !category.source || !category.values) {
      this.categoryColumn = undefined;
      return [];
    }

    this.categoryColumn = category.source;
    const counts = new Map<string, number>();
    for (const value of category.values) {
      const text = this.text(value);
      if (!text) {
        continue;
      }
      counts.set(text, (counts.get(text) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        count,
        searchText: value.toLocaleLowerCase()
      }))
      .sort((left, right) => left.value.localeCompare(right.value, undefined, { numeric: true, sensitivity: "base" }));
  }

  private text(value: PrimitiveValue): string {
    return value === null || value === undefined ? "" : String(value);
  }

  private onSearchInput(): void {
    this.searchText = this.searchInput.value.trim();
    this.render();
    if (!this.settings.applySearchWhileTyping) {
      return;
    }
    if (this.searchTimer !== undefined) {
      window.clearTimeout(this.searchTimer);
    }
    this.searchTimer = window.setTimeout(() => this.applySearchFilter(), 250);
  }

  private render(): void {
    this.list.replaceChildren();

    if (!this.categoryColumn) {
      this.renderEmpty("Add a field.");
      this.updateCount(0);
      return;
    }

    const visibleItems = this.visibleItems();
    this.updateCount(visibleItems.length);

    if (visibleItems.length === 0) {
      this.renderEmpty("No values");
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const item of visibleItems) {
      fragment.appendChild(this.renderItem(item));
    }
    this.list.appendChild(fragment);
  }

  private visibleItems(): SlicerItem[] {
    const needle = this.searchText.toLocaleLowerCase();
    if (!needle) {
      return this.items;
    }
    return this.items.filter(item => item.searchText.includes(needle));
  }

  private updateCount(visibleCount: number): void {
    this.countLabel.textContent = this.settings.showCounts
      ? `${this.selectedValues.size}/${visibleCount}/${this.items.length}`
      : "";
  }

  private renderItem(item: SlicerItem): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "qss-item";
    button.type = "button";
    button.title = item.value;
    button.style.minHeight = `${this.settings.rowHeight}px`;
    if (this.selectedValues.has(item.value)) {
      button.classList.add("is-selected");
    }

    const check = document.createElement("span");
    check.className = "qss-check";
    check.textContent = this.selectedValues.has(item.value) ? "✓" : "";
    button.appendChild(check);

    const label = document.createElement("span");
    label.className = "qss-item-label";
    label.textContent = item.value;
    button.appendChild(label);

    if (this.settings.showCounts) {
      const count = document.createElement("span");
      count.className = "qss-item-count";
      count.textContent = String(item.count);
      button.appendChild(count);
    }

    button.addEventListener("click", event => {
      const additive = this.settings.allowMultiSelect && (event.ctrlKey || event.metaKey || event.shiftKey);
      this.toggleSelection(item.value, additive);
    });
    return button;
  }

  private renderEmpty(message: string): void {
    const empty = document.createElement("div");
    empty.className = "qss-empty";
    empty.textContent = message;
    this.list.appendChild(empty);
  }

  private toggleSelection(value: string, additive: boolean): void {
    if (this.selectedValues.has(value)) {
      this.selectedValues.delete(value);
    } else {
      if (!this.settings.allowMultiSelect || !additive) {
        this.selectedValues.clear();
      }
      this.selectedValues.add(value);
    }
    this.applyActiveFilter();
    this.render();
  }

  private clearSelection(): void {
    this.selectedValues.clear();
    this.applyActiveFilter();
    this.render();
  }

  private clearSearch(): void {
    this.searchText = "";
    this.searchInput.value = "";
    this.applyActiveFilter();
    this.render();
  }

  private clearAllState(): void {
    if (this.searchTimer !== undefined) {
      window.clearTimeout(this.searchTimer);
      this.searchTimer = undefined;
    }
    this.selectedValues.clear();
    this.searchText = "";
    this.searchInput.value = "";
    this.applyActiveFilter();
    this.render();
  }

  private applyActiveFilter(): void {
    const target = this.currentTarget();
    if (!target) {
      return;
    }

    if (this.selectedValues.size > 0) {
      const filter: BasicInFilter = {
        $schema: "https://powerbi.com/product/schema#basic",
        target,
        operator: "In",
        values: Array.from(this.selectedValues),
        filterType: 1
      };
      this.host.applyJsonFilter(filter, "general", "filter", FilterAction.merge);
      return;
    }

    const value = this.searchText.trim();
    if (value) {
      const filter: AdvancedContainsFilter = {
        $schema: "https://powerbi.com/product/schema#advanced",
        target,
        logicalOperator: "And",
        conditions: [{ operator: "Contains", value }],
        filterType: 0
      };
      this.host.applyJsonFilter(filter, "general", "filter", FilterAction.merge);
      return;
    }

    this.host.applyJsonFilter(null, "general", "filter", FilterAction.remove);
  }

  private applySearchFilter(): void {
    if (this.selectedValues.size > 0) {
      this.selectedValues.clear();
    }
    this.applyActiveFilter();
  }

  private currentTarget(): FilterTarget | undefined {
    const queryName = this.categoryColumn && this.categoryColumn.queryName;
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

  private syncFromFilters(filters: powerbi.IFilter[]): void {
    const target = this.currentTarget();
    if (!target) {
      this.selectedValues.clear();
      this.searchText = "";
      return;
    }

    const selected = new Set<string>();
    let hasSelectionFilter = false;
    let hasSearchFilter = false;
    let search = this.searchText;
    for (const filter of filters as any[]) {
      if (!filter || !this.targetsMatch(filter.target, target)) {
        continue;
      }
      if (filter.operator === "In" && Array.isArray(filter.values)) {
        hasSelectionFilter = true;
        filter.values.forEach((value: unknown) => selected.add(String(value)));
      }
      if (Array.isArray(filter.conditions)) {
        const contains = filter.conditions.find((condition: any) => condition.operator === "Contains");
        if (contains && typeof contains.value === "string") {
          hasSearchFilter = true;
          search = contains.value;
        }
      }
    }

    if (hasSelectionFilter) {
      this.selectedValues.clear();
      selected.forEach(value => this.selectedValues.add(value));
      this.searchText = "";
    }
    if (!hasSelectionFilter && hasSearchFilter) {
      this.searchText = search;
    }
    if (!hasSelectionFilter && !hasSearchFilter) {
      this.selectedValues.clear();
      this.searchText = "";
    }
  }

  private targetsMatch(filterTarget: any, target: FilterTarget): boolean {
    return !!filterTarget && filterTarget.table === target.table && filterTarget.column === target.column;
  }

  private resetStateIfTargetChanged(): void {
    const target = this.currentTarget();
    const nextTargetKey = target ? `${target.table}.${target.column}` : "";
    if (nextTargetKey === this.targetKey) {
      return;
    }
    this.targetKey = nextTargetKey;
    this.selectedValues.clear();
    this.searchText = "";
  }
}
