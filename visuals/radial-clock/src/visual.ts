import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataViewObjects = powerbi.DataViewObjects;
import DataViewObject = powerbi.DataViewObject;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;

interface ClockSettings {
    size: number;
    faceColor: string;
    frameColor: string;
    secondColor: string;
}

const DEFAULTS: ClockSettings = {
    size: 180,
    faceColor: "#d9efff",
    frameColor: "#245a78",
    secondColor: "#d93333"
};

function getValue<T>(objects: DataViewObjects, objectName: string, propertyName: string, defaultValue: T): T {
    if (objects) {
        const object = objects[objectName] as DataViewObject;
        if (object) {
            const property = object[propertyName] as T;
            if (property !== undefined) {
                return property;
            }
        }
    }
    return defaultValue;
}

function getColor(objects: DataViewObjects, propertyName: string, defaultValue: string): string {
    const fill = getValue<powerbi.Fill>(objects, "clock", propertyName, undefined);
    if (fill && fill.solid && fill.solid.color) {
        return fill.solid.color;
    }
    return defaultValue;
}

export class Visual implements IVisual {
    private root: HTMLElement;
    private face: HTMLElement;
    private hourHand: HTMLElement;
    private minuteHand: HTMLElement;
    private secondHand: HTMLElement;
    private center: HTMLElement;
    private numbers: HTMLElement[] = [];
    private settings: ClockSettings = DEFAULTS;
    private timer: number = 0;

    constructor(options: VisualConstructorOptions) {
        this.root = options.element;

        this.face = document.createElement("div");
        this.face.className = "rc-clock";
        this.root.appendChild(this.face);

        for (let n = 1; n <= 12; n++) {
            const num = document.createElement("div");
            num.className = "rc-num";
            num.textContent = String(n);
            this.face.appendChild(num);
            this.numbers.push(num);
        }

        this.hourHand = document.createElement("div");
        this.hourHand.className = "rc-hand";
        this.face.appendChild(this.hourHand);

        this.minuteHand = document.createElement("div");
        this.minuteHand.className = "rc-hand";
        this.face.appendChild(this.minuteHand);

        this.secondHand = document.createElement("div");
        this.secondHand.className = "rc-hand";
        this.face.appendChild(this.secondHand);

        this.center = document.createElement("div");
        this.center.className = "rc-center";
        this.face.appendChild(this.center);

        this.applyLayout();
        this.tick();
        this.timer = window.setInterval(() => this.tick(), 200);
    }

    public update(options: VisualUpdateOptions): void {
        const objects: DataViewObjects = options.dataViews && options.dataViews[0] && options.dataViews[0].metadata
            ? options.dataViews[0].metadata.objects
            : undefined;

        this.settings = {
            size: getValue<number>(objects, "clock", "size", DEFAULTS.size),
            faceColor: getColor(objects, "faceColor", DEFAULTS.faceColor),
            frameColor: getColor(objects, "frameColor", DEFAULTS.frameColor),
            secondColor: getColor(objects, "secondColor", DEFAULTS.secondColor)
        };
        if (!this.settings.size || this.settings.size < 40) {
            this.settings.size = DEFAULTS.size;
        }
        this.applyLayout();
        this.tick();
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        const instances: powerbi.VisualObjectInstance[] = [{
            objectName: "clock",
            displayName: "Clock",
            selector: null,
            properties: {
                size: this.settings.size,
                faceColor: { solid: { color: this.settings.faceColor } },
                frameColor: { solid: { color: this.settings.frameColor } },
                secondColor: { solid: { color: this.settings.secondColor } }
            }
        }];
        return instances;
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return {
            cards: [
                {
                    uid: "clockCard",
                    displayName: "Clock",
                    groups: [
                        {
                            uid: "clockGroup",
                            displayName: "Clock",
                            slices: [
                                this.numericSlice("size", "Size (px)", this.settings.size),
                                this.colorSlice("faceColor", "Face color", this.settings.faceColor),
                                this.colorSlice("frameColor", "Frame and hands color", this.settings.frameColor),
                                this.colorSlice("secondColor", "Second hand color", this.settings.secondColor)
                            ]
                        }
                    ],
                    revertToDefaultDescriptors: [
                        { objectName: "clock", propertyName: "size" },
                        { objectName: "clock", propertyName: "faceColor" },
                        { objectName: "clock", propertyName: "frameColor" },
                        { objectName: "clock", propertyName: "secondColor" }
                    ]
                }
            ]
        };
    }

    private numericSlice(name: string, displayName: string, value: number): powerbi.visuals.FormattingSlice {
        return {
            uid: `clock_${name}`,
            displayName,
            control: {
                type: "NumUpDown",
                properties: {
                    descriptor: {
                        objectName: "clock",
                        propertyName: name
                    },
                    value
                }
            }
        } as powerbi.visuals.FormattingSlice;
    }

    private colorSlice(name: string, displayName: string, value: string): powerbi.visuals.FormattingSlice {
        return {
            uid: `clock_${name}`,
            displayName,
            control: {
                type: "ColorPicker",
                properties: {
                    descriptor: {
                        objectName: "clock",
                        propertyName: name
                    },
                    value: {
                        value
                    }
                }
            }
        } as powerbi.visuals.FormattingSlice;
    }

    private applyLayout(): void {
        const s = this.settings;
        const size = s.size;
        const k = size / 180; // relative geometry unit (design base: 180px)

        this.face.style.width = size + "px";
        this.face.style.height = size + "px";
        this.face.style.border = Math.max(1, Math.round(3 * k)) + "px solid " + s.frameColor;
        this.face.style.boxShadow = "inset 0 0 0 " + Math.max(1, Math.round(2 * k)) + "px rgba(255,255,255,.82), 0 1px 4px rgba(0,0,0,.2)";
        this.face.style.background =
            "radial-gradient(circle at 50% 42%, #f8fcff 0%, " + s.faceColor + " 72%, " + s.frameColor + " 100%)";
        this.face.style.color = s.frameColor;

        const radius = size / 2;
        const numRadius = radius - 25 * k;
        const numSize = 28 * k;
        for (let n = 1; n <= 12; n++) {
            const el = this.numbers[n - 1];
            const ang = (n % 12) * 30 * Math.PI / 180;
            el.style.left = (radius + Math.sin(ang) * numRadius) + "px";
            el.style.top = (radius - Math.cos(ang) * numRadius) + "px";
            el.style.width = numSize + "px";
            el.style.height = 20 * k + "px";
            el.style.fontSize = 15 * k + "px";
        }

        const hourW = 8 * k, hourH = 45 * k;
        const minW = 5 * k, minH = 63 * k;
        const secW = 2 * k, secH = 76 * k;
        this.setHand(this.hourHand, radius, hourW, hourH, s.frameColor);
        this.setHand(this.minuteHand, radius, minW, minH, s.frameColor);
        this.setHand(this.secondHand, radius, secW, secH, s.secondColor);

        const c = 18 * k;
        this.center.style.left = radius + "px";
        this.center.style.top = radius + "px";
        this.center.style.width = c + "px";
        this.center.style.height = c + "px";
        this.center.style.background = s.frameColor;
        this.center.style.boxShadow = "inset 0 0 0 " + Math.max(1, Math.round(4 * k)) + "px " + s.faceColor;
    }

    private setHand(el: HTMLElement, radius: number, w: number, h: number, color: string): void {
        el.style.left = radius + "px";
        el.style.bottom = radius + "px";
        el.style.width = w + "px";
        el.style.height = h + "px";
        el.style.marginLeft = (-w / 2) + "px";
        el.style.background = color;
    }

    private tick(): void {
        const now = new Date();
        const ms = now.getMilliseconds() / 1000;
        const sec = now.getSeconds() + ms;
        const min = now.getMinutes() + sec / 60;
        const hr = (now.getHours() % 12) + min / 60;

        this.secondHand.style.transform = "rotate(" + (sec * 6) + "deg)";
        this.minuteHand.style.transform = "rotate(" + (min * 6) + "deg)";
        this.hourHand.style.transform = "rotate(" + (hr * 30) + "deg)";
    }

    public destroy(): void {
        if (this.timer) {
            window.clearInterval(this.timer);
            this.timer = 0;
        }
    }
}
