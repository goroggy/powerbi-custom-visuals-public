"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DataView = powerbi.DataView;
import DataViewObjects = powerbi.DataViewObjects;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;

interface VisualSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  padding: number;
  textColor: string;
  backgroundColor: string;
  centerText: boolean;
  rightAlign: boolean;
}

export class Visual implements IVisual {
  private readonly root: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private settings: VisualSettings = {
    fontFamily: "Segoe UI",
    fontSize: 14,
    lineHeight: 1.35,
    padding: 8,
    textColor: "#222222",
    backgroundColor: "#ffffff",
    centerText: false,
    rightAlign: false
  };

  constructor(options: VisualConstructorOptions) {
    this.root = document.createElement("div");
    this.root.className = "scrollable-text";
    options.element.appendChild(this.root);

    this.content = document.createElement("div");
    this.content.className = "st-content";
    this.root.appendChild(this.content);
  }

  public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews && options.dataViews[0];
    this.settings = this.readSettings(dataView);
    this.applySettings();
    this.content.textContent = this.readText(dataView);
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
          lineHeight: this.settings.lineHeight,
          padding: this.settings.padding,
          centerText: this.settings.centerText,
          rightAlign: this.settings.rightAlign,
          textColor: { solid: { color: this.settings.textColor } },
          backgroundColor: { solid: { color: this.settings.backgroundColor } }
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
                this.numericSlice("lineHeight", "Line height", this.settings.lineHeight),
                this.numericSlice("padding", "Padding", this.settings.padding),
                this.toggleSlice("centerText", "Center text", this.settings.centerText),
                this.toggleSlice("rightAlign", "Right align", this.settings.rightAlign),
                this.colorSlice("textColor", "Text color", this.settings.textColor),
                this.colorSlice("backgroundColor", "Background color", this.settings.backgroundColor)
              ]
            }
          ],
          revertToDefaultDescriptors: [
            { objectName: "style", propertyName: "fontFamily" },
            { objectName: "style", propertyName: "fontSize" },
            { objectName: "style", propertyName: "lineHeight" },
            { objectName: "style", propertyName: "padding" },
            { objectName: "style", propertyName: "centerText" },
            { objectName: "style", propertyName: "rightAlign" },
            { objectName: "style", propertyName: "textColor" },
            { objectName: "style", propertyName: "backgroundColor" }
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
      lineHeight: this.objectNumber(objects, "style", "lineHeight", 1.35),
      padding: this.objectNumber(objects, "style", "padding", 8),
      textColor: this.objectFill(objects, "style", "textColor", "#222222"),
      backgroundColor: this.objectFill(objects, "style", "backgroundColor", "#ffffff"),
      centerText: this.objectBool(objects, "style", "centerText", false),
      rightAlign: this.objectBool(objects, "style", "rightAlign", false)
    };
  }

  private objectNumber(
    objects: DataViewObjects | undefined,
    objectName: string,
    propertyName: string,
    defaultValue: number
  ): number {
    const value = objects && objects[objectName] && objects[objectName][propertyName] as any;
    return typeof value === "number" && isFinite(value) ? value : defaultValue;
  }

  private objectFill(
    objects: DataViewObjects | undefined,
    objectName: string,
    propertyName: string,
    defaultValue: string
  ): string {
    const value = objects && objects[objectName] && objects[objectName][propertyName] as any;
    const color = value && value.solid && value.solid.color;
    return typeof color === "string" && color ? color : defaultValue;
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
    const textAlign = this.settings.rightAlign ? "right" : this.settings.centerText ? "center" : "left";
    this.root.style.setProperty("--st-font-family", this.settings.fontFamily);
    this.root.style.setProperty("--st-font-size", `${this.settings.fontSize}px`);
    this.root.style.setProperty("--st-line-height", String(this.settings.lineHeight));
    this.root.style.setProperty("--st-padding", `${this.settings.padding}px`);
    this.root.style.setProperty("--st-text-color", this.settings.textColor);
    this.root.style.setProperty("--st-background-color", this.settings.backgroundColor);
    this.root.style.setProperty("--st-text-align", textAlign);
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

  private colorSlice(name: string, displayName: string, value: string): powerbi.visuals.FormattingSlice {
    return {
      uid: `style_${name}`,
      displayName,
      control: {
        type: "ColorPicker",
        properties: {
          descriptor: {
            objectName: "style",
            propertyName: name
          },
          value: {
            value
          }
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
          descriptor: {
            objectName: "style",
            propertyName: name
          },
          value
        }
      }
    } as powerbi.visuals.FormattingSlice;
  }

  private readText(dataView?: DataView): string {
    const table = dataView && dataView.table;
    if (!table || !table.rows || table.rows.length === 0 || table.rows[0].length === 0) {
      return "";
    }
    return this.text(table.rows[0][0]);
  }

  private text(value: PrimitiveValue): string {
    return value === null || value === undefined ? "" : String(value);
  }
}
