/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Highcharts from 'highcharts';
import Contourmap from '../Contourmap';

export interface HeatmapPoint extends Highcharts.Point {
    value: number | null;
    x: number;
    y: number;
}

export interface ColorAxis extends Highcharts.Axis {
    stops: Highcharts.GradientColorStopObject[];
}

export interface HeatmapSeries extends Highcharts.Series {
    canvas?: HTMLCanvasElement;
    context?: CanvasRenderingContext2D;
    data: Array<HeatmapPoint>;
    points: Array<HeatmapPoint>;
    valueData?: Array<number>;
    valueMax: number;
    valueMin: number;
    isDirtyCanvas: boolean;
    drawPoints(): void;
    contourmap?: Contourmap;
    colorAxis?: ColorAxis;
}

export type RenderContourFunction = (series: HeatmapSeries) => void;

/**
 * A module for adding contour lines to a heatmap. Requires the heatmap module to be loaded first.
 *
 * @param H - Highcharts instance
 */
export default function (H: typeof Highcharts): void {
    const HeatmapSeries = (H as any)._modules['Series/Heatmap/HeatmapSeries.js'];

    H.wrap(HeatmapSeries.prototype, 'drawPoints', async function (proceed: Function) {
        const series = this as HeatmapSeries;

        if (this.options.contour?.enabled) {
            if (!series.contourmap) {
                series.contourmap = new Contourmap(series);
            }

            await series.contourmap.run();
            series.contourmap.setExtremes();
        } else {
            if (series.contourmap) {
                series.contourmap.destroy();
                delete series.contourmap;
            }

            proceed.apply(this);
        }
    });
}

declare module 'highcharts/highcharts' {
    interface PlotHeatmapOptions {
        contour?: {
            enabled?: boolean;
        }
    }
}
