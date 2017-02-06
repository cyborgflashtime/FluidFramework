import * as ink from "ot-ink";
import * as geometry from "./geometry/index";
import { Circle, IShape, Polygon } from "./shapes/index";
import * as utils from "./utils";

// TODO split classes into separate files
// tslint:disable:max-classes-per-file

// TODO remove before commit
// tslint:disable:no-console

export enum SegmentCircleInclusive {
    None,
    Both,
    Start,
    End,
}

interface IPtrEvtPoint {
    x: number;
    y: number;
}

interface IPointerPointProps {
    isEraser: boolean;
}

class EventPoint {
    public rawPosition: IPtrEvtPoint;
    public properties: IPointerPointProps;

    constructor(evt: PointerEvent) {
        this.rawPosition = { x: evt.x, y: evt.y };
        this.properties = { isEraser: false };
    }
}

export default class InkCanvas {
    public canvas: HTMLCanvasElement;
    public context: CanvasRenderingContext2D;
    public penID: number = -1;
    public gesture: MSGesture;

    private snapshot: ink.Snapshot;
    private currentStylusActionId: string;
    private currentPen: ink.IPen;

    // constructor
    constructor(parent: HTMLElement, private model: any) {
        // Load the snapshot from the model
        this.snapshot = ink.Snapshot.Clone(model.data);

        // Listen for updates from the server
        this.model.on("op", (op, source) => {
            if (source === this) {
                return;
            }

            // Update the canvas
            this.addAndDrawStroke(op as ink.IDelta, false);
        });

        // setup canvas
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("drawSurface");
        parent.appendChild(this.canvas);

        // get context
        this.context = this.canvas.getContext("2d");

        let bb = false;
        this.canvas.addEventListener("pointerdown", (evt) => this.handlePointerDown(evt), bb);
        this.canvas.addEventListener("pointermove", (evt) => this.handlePointerMove(evt), bb);
        this.canvas.addEventListener("pointerup", (evt) => this.handlePointerUp(evt), bb);

        this.currentPen = {
            color: { r: 1, g: 0, b: 0, a: 1 },
            thickness: 10,
        };

        // Set the initial size of hte canvas and then register for resize events to be able to update it
        this.resize(this.canvas.offsetWidth, this.canvas.offsetHeight);
        window.addEventListener("throttled-resize", (event) => {
            this.resize(this.canvas.offsetWidth, this.canvas.offsetHeight);
        });
    }
    // tslint:disable:no-empty
    // Stubs for bunch of functions that are being called in the code below
    // this will make it easier to fill some code in later or just delete them

    public tempEraseMode() {
    }

    public restoreMode() {
    }

    public anchorSelection() {
    }

    public selectAll() {
    }

    public inkMode() {
    }

    public inkColor() {
    }

    public undo() {
    }

    public redo() {
    }

    // tslint:enable:no-empty

    public anySelected(): boolean {
        return false;
    }

    // We will accept pen down or mouse left down as the start of a stroke.
    // We will accept touch down or mouse right down as the start of a touch.
    public handlePointerDown(evt) {
        this.penID = evt.pointerId;

        if (evt.pointerType === "touch") {
            // ic.gesture.addPointer(evt.pointerId);
        }

        if ((evt.pointerType === "pen") || ((evt.pointerType === "mouse") && (evt.button === 0))) {
            // Anchor and clear any current selection.
            this.anchorSelection();
            let pt = new EventPoint(evt);

            if (pt.properties.isEraser) { // The back side of a pen, which we treat as an eraser
                this.tempEraseMode();
            } else {
                this.restoreMode();
            }

            let delta = new ink.Delta().stylusDown(pt.rawPosition, evt.pressure, this.currentPen);
            this.currentStylusActionId = delta.operation.stylusDown.id;
            this.addAndDrawStroke(delta, true);

            evt.returnValue = false;
        }
    }

    public handlePointerMove(evt) {
        if (evt.pointerId === this.penID) {
            // if (evt.pointerType === "touch") {
            // if (evt.pointerType === "pen") {
            // } else {
            // }

            let delta = new ink.Delta().stylusMove(
                { x: evt.clientX, y: evt.clientY },
                evt.pressure,
                this.currentStylusActionId);
            this.addAndDrawStroke(delta, true);

            evt.returnValue = false;
        }

        return false;
    }

    public handlePointerUp(evt) {
        if (evt.pointerId === this.penID) {
            this.penID = -1;
            let pt = new EventPoint(evt);
            evt.returnValue = false;

            let delta = new ink.Delta().stylusUp(
                { x: evt.clientX, y: evt.clientY },
                evt.pressure,
                this.currentStylusActionId);
            this.currentStylusActionId = undefined;

            this.addAndDrawStroke(delta, true);
        }

        return false;
    }

    // We treat the event of the pen leaving the canvas as the same as the pen lifting;
    // it completes the stroke.
    public handlePointerOut(evt) {
        if (evt.pointerId === this.penID) {
            let pt = new EventPoint(evt);
            this.penID = -1;

            let delta = new ink.Delta().stylusUp(
                { x: evt.clientX, y: evt.clientY },
                evt.pressure,
                this.currentStylusActionId);
            this.currentStylusActionId = undefined;

            this.addAndDrawStroke(delta, true);
        }

        return false;
    }

    public handleTap(evt) {
        // Anchor and clear any current selection.
        if (this.anySelected()) {
            this.anchorSelection();
        }
        return false;
    }

    public clear() {
        if (!this.anySelected()) {
            this.selectAll();
            this.inkMode();
        }

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        utils.displayStatus("");
        utils.displayError("");
    }

    public replay() {
        this.clearCanvas();

        // if (this.strokes.length > 0) {
        //     this.animateStroke(0);
        // }
    }

    private animateStroke(index: number) {
        // Draw the requested stroke
        // let currentStroke = this.strokes[index];
        // let previousStroke = index - 1 >= 0 ? this.strokes[index - 1] : null;
        // this.drawStroke(currentStroke, previousStroke);

        // // And then ask for the next one
        // let nextStroke = index + 1 < this.strokes.length ? this.strokes[index + 1] : null;
        // if (nextStroke) {
        //     let time = nextStroke.time - currentStroke.time;
        //     setTimeout(() => this.animateStroke(index + 1), time);
        // }
    }

    /**
     * Clears the canvas
     */
    private clearCanvas() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private redraw() {
        this.clearCanvas();

        for (let layer of this.snapshot.layers) {
            let previous: ink.IOperation = layer.operations[0];
            for (let operation of layer.operations) {
                this.drawStroke(layer, operation, previous);
                previous = operation;
            }
        }
    }

    private drawStroke(
        layer: ink.IInkLayer,
        current: ink.IOperation,
        previous: ink.IOperation) {

        let type = ink.getActionType(current);
        let shapes: IShape[];

        let currentAction = ink.getStylusAction(current);
        let previousAction = ink.getStylusAction(previous);
        let pen = layer.operations[0].stylusDown.pen;

        switch (type) {
            case ink.ActionType.StylusDown:
                shapes = this.getShapes(currentAction, currentAction, pen, SegmentCircleInclusive.End);
                break;

            case ink.ActionType.StylusMove:
                shapes = this.getShapes(previousAction, currentAction, pen, SegmentCircleInclusive.End);
                break;

            case ink.ActionType.StylusUp:
                shapes = this.getShapes(previousAction, currentAction, pen, SegmentCircleInclusive.End);
                break;

            default:
                break;
        }

        if (shapes) {
            for (let shape of shapes) {
                this.context.beginPath();
                shape.render(this.context);
                this.context.closePath();
                this.context.fill();
            }
        }
    }

    /**
     * Resizes the canvas
     */
    private resize(width: number, height: number) {
        // Updates the size of the canvas
        this.canvas.width = width;
        this.canvas.height = height;

        // And then redraw the canvas
        this.redraw();
    }

    private addAndDrawStroke(delta: ink.IDelta, submit: boolean) {
        if (submit) {
            this.model.submitOp(delta, { source: this });
        }

        // Add the delta to our snapshot
        console.log(`Applying ${JSON.stringify(delta)}`);
        // this.snapshot.apply(delta);

        // Get the layer the delta applies to
        let stylusId = ink.getStylusId(delta.operation);
        let layer = this.snapshot.layers[this.snapshot.layerIndex[stylusId]];

        // render the stroke
        let lastOperation = layer.operations.length > 1
            ? layer.operations[layer.operations.length - 2]
            : layer.operations[0];

        this.drawStroke(layer, delta.operation, lastOperation);
    }

    /***
     * given start point and end point, get MixInk shapes to render. The returned MixInk
     * shapes may contain one or two circles whose center is either start point or end point.
     * Enum SegmentCircleInclusive determins whether circle is in the return list.
     * Besides circles, a trapezoid that serves as a bounding box of two stroke point is also returned.
     */
    private getShapes(
        startPoint: ink.IStylusAction,
        endPoint: ink.IStylusAction,
        pen: ink.IPen,
        circleInclusive: SegmentCircleInclusive): IShape[] {

        console.log(`Start: ${startPoint.point.x} ${startPoint.point.y}`);
        console.log(`  End: ${startPoint.point.x} ${startPoint.point.y}`);

        let dirVector = new geometry.Vector(
            endPoint.point.x - startPoint.point.x,
            endPoint.point.y - startPoint.point.y);
        let len = dirVector.length();

        let shapes = new Array<IShape>();
        let trapezoidP0: geometry.IPoint;
        let trapezoidP1: geometry.IPoint;
        let trapezoidP2: geometry.IPoint;
        let trapezoidP3: geometry.IPoint;
        let normalizedLateralVector: geometry.IVector;
        let widthAtStart = pen.thickness / 2;
        let widthAtEnd = pen.thickness / 2;

        // Just draws a circle on small values??
        if (len + Math.min(widthAtStart, widthAtEnd) <= Math.max(widthAtStart, widthAtEnd)) {
            console.log("just a circle");
            let center = widthAtStart >= widthAtEnd ? startPoint : endPoint;
            shapes.push(new Circle({ x: center.point.x, y: center.point.y }, pen.thickness / 2));
            return shapes;
        }

        console.log("Not a circle");
        if (len === 0) {
            return null;
        }

        if (widthAtStart !== widthAtEnd) {
            let angle = Math.acos(Math.abs(widthAtStart - widthAtEnd) / len);

            if (widthAtStart < widthAtEnd) {
                angle = Math.PI - angle;
            }

            normalizedLateralVector = geometry.Vector.normalize(geometry.Vector.rotate(dirVector, -angle));
            trapezoidP0 = new geometry.Point(
                startPoint.point.x + widthAtStart * normalizedLateralVector.x,
                startPoint.point.y + widthAtStart * normalizedLateralVector.y);
            trapezoidP3 = new geometry.Point(
                endPoint.point.x + widthAtEnd * normalizedLateralVector.x,
                endPoint.point.y + widthAtEnd * normalizedLateralVector.y);

            normalizedLateralVector = geometry.Vector.normalize(geometry.Vector.rotate(dirVector, angle));
            trapezoidP2 = new geometry.Point(
                endPoint.point.x + widthAtEnd * normalizedLateralVector.x,
                endPoint.point.y + widthAtEnd * normalizedLateralVector.y);
            trapezoidP1 = new geometry.Point(
                startPoint.point.x + widthAtStart * normalizedLateralVector.x,
                startPoint.point.y + widthAtStart * normalizedLateralVector.y);
        } else {
            normalizedLateralVector = new geometry.Vector(-dirVector.y / len, dirVector.x / len);

            trapezoidP0 = new geometry.Point(
                startPoint.point.x + widthAtStart * normalizedLateralVector.x,
                startPoint.point.y + widthAtStart * normalizedLateralVector.y);
            trapezoidP1 = new geometry.Point(
                startPoint.point.x - widthAtStart * normalizedLateralVector.x,
                startPoint.point.y - widthAtStart * normalizedLateralVector.y);

            trapezoidP2 = new geometry.Point(
                endPoint.point.x - widthAtEnd * normalizedLateralVector.x,
                endPoint.point.y - widthAtEnd * normalizedLateralVector.y);
            trapezoidP3 = new geometry.Point(
                endPoint.point.x + widthAtEnd * normalizedLateralVector.x,
                endPoint.point.y + widthAtEnd * normalizedLateralVector.y);
        }

        let polygon = new Polygon([trapezoidP0, trapezoidP3, trapezoidP2, trapezoidP1]);
        shapes.push(polygon);

        switch (circleInclusive) {
            case SegmentCircleInclusive.None:
                break;
            case SegmentCircleInclusive.Both:
                shapes.push(new Circle({ x: startPoint.point.x, y: startPoint.point.y }, pen.thickness / 2));
                shapes.push(new Circle({ x: endPoint.point.x, y: endPoint.point.y }, pen.thickness / 2));
                break;
            case SegmentCircleInclusive.Start:
                shapes.push(new Circle({ x: startPoint.point.x, y: startPoint.point.y }, pen.thickness / 2));
                break;
            case SegmentCircleInclusive.End:
                shapes.push(new Circle({ x: endPoint.point.x, y: endPoint.point.y }, pen.thickness / 2));
                break;
            default:
                break;
        }

        return shapes;
    }
}
