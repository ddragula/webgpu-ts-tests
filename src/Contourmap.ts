import type { HeatmapSeries } from './hc-modules/ContourModule';
import type { PlotHeatmapOptions } from 'highcharts/highcharts';

import Delaunator from 'delaunator';
import basicShader from './shaders/shader.wgsl';
import colorToArray from './utils/colorToArray';

/**
 * Contourmap rendering class.
 */
export default class Contourmap {
    private series: HeatmapSeries;

    private extremesUniform: Float32Array;
    private extremesUniformBuffer: GPUBuffer;
    private valueExtremesUniform: Float32Array;
    private valueExtremesUniformBuffer: GPUBuffer;
    private contourIntervalUniformBuffer: GPUBuffer;
    private smoothColoringUniformBuffer: GPUBuffer;
    private showContourLinesUniformBuffer: GPUBuffer;

    private context: GPUCanvasContext;
    private device?: GPUDevice;
    private adapter?: GPUAdapter;

    private render?: (() => void);

    /**
     * Creates an instance of the App.
     * @param series - The heatmap series to render the contourmap to.
     */
    constructor(series: HeatmapSeries) {
        this.series = series;

        // Remove the old canvas if it exists
        series.canvas?.remove();

        // Create a new canvas
        const canvas = document.createElement('canvas');
        series.canvas = canvas;

        canvas.classList.add('contourmap-canvas');
        series.chart.container.appendChild(canvas);

        this.context = canvas.getContext('webgpu');
    }

    private triangulateData(): Delaunator<Float32Array> {
        const points2d: Float32Array = new Float32Array(this.series.points.length * 2);

        const extremes = this.getExtremes();
        let xDivider = 1, yDivider = 1;
        if (Math.abs(extremes[0]) > 10e6) {
            xDivider = 10e6;
        }
        if (Math.abs(extremes[2]) > 10e6) {
            yDivider = 10e6;
        }

        this.series.points.forEach((point, i) => {
            points2d[i * 2] = point.x / xDivider;
            points2d[i * 2 + 1] = point.y / yDivider;
        });

        const result = new Delaunator(points2d);

        return result;
    }

    private get3DData() {
        const points3d: Float32Array = new Float32Array(this.series.points.length * 3);

        this.series.points.forEach((point, i) => {
            points3d[i * 3] = point.x;
            points3d[i * 3 + 1] = point.y;
            points3d[i * 3 + 2] = point.value;
        });

        return points3d;
    }

    /**
     * An asynchronous method that runs the renderer.
     */
    async run() {
        const { context } = this;
        if (!this.adapter) {
            this.adapter = await navigator.gpu.requestAdapter();
        }
        if (!this.device) {
            this.device = await this.adapter.requestDevice();
        }
        const { device } = this;

        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device: device,
            format: canvasFormat,
        });

        const vertices = this.get3DData();
        const indices = this.triangulateData().triangles;

        const extremesUniform = this.extremesUniform = new Float32Array(this.getExtremes());
        const valueExtremesUniform = this.valueExtremesUniform = new Float32Array(this.getDataExtremes());
        const colorAxisStops = this.getColorAxisStopsData();

        const vertexBuffer = device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });

        const indexBuffer = device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });

        const extremesUniformBuffer = this.extremesUniformBuffer = device.createBuffer({
            size: extremesUniform.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const valueExtremesUniformBuffer = this.valueExtremesUniformBuffer = device.createBuffer({
            size: valueExtremesUniform.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const colorAxisStopsBuffer = device.createBuffer({
            size: colorAxisStops.array.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });

        const colorAxisStopsCountBuffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });

        this.contourIntervalUniformBuffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.smoothColoringUniformBuffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.showContourLinesUniformBuffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        device.queue.writeBuffer(vertexBuffer, 0, vertices);
        device.queue.writeBuffer(indexBuffer, 0, indices);
        device.queue.writeBuffer(extremesUniformBuffer, 0, extremesUniform);
        device.queue.writeBuffer(valueExtremesUniformBuffer, 0, valueExtremesUniform);
        this.setContourIntervalUniform();
        this.setSmoothColoringUniform();
        this.setShowContourLinesUniform();

        new Float32Array(colorAxisStopsBuffer.getMappedRange()).set(colorAxisStops.array);
        colorAxisStopsBuffer.unmap();

        new Uint32Array(colorAxisStopsCountBuffer.getMappedRange())[0] = colorAxisStops.length;
        colorAxisStopsCountBuffer.unmap();

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 12,
            attributes: [{
                format: 'float32x3',
                offset: 0,
                shaderLocation: 0,
            }] as GPUVertexAttribute[],
        };

        const shaderModule = device.createShaderModule({
            code: basicShader,
        });

        const pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: 'vertexMain',
                buffers: [vertexBufferLayout],
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fragmentMain',
                targets: [{
                    format: canvasFormat,
                }],
            },
            primitive: {
                topology: 'triangle-list',
            },
        });

        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: {
                    buffer: extremesUniformBuffer,
                },
            }, {
                binding: 1,
                resource: {
                    buffer: valueExtremesUniformBuffer,
                },
            }, {
                binding: 2,
                resource: {
                    buffer: colorAxisStopsBuffer,
                },
            }, {
                binding: 3,
                resource: {
                    buffer: colorAxisStopsCountBuffer,
                },
            }, {
                binding: 4,
                resource: {
                    buffer: this.contourIntervalUniformBuffer,
                },
            }, {
                binding: 5,
                resource: {
                    buffer: this.smoothColoringUniformBuffer,
                },
            }, {
                binding: 6,
                resource: {
                    buffer: this.showContourLinesUniformBuffer,
                },
            }],
        });

        this.render = function render() {
            const encoder = device.createCommandEncoder();

            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'clear' as GPULoadOp,
                    clearValue: [ 1, 1, 1, 1 ],
                    storeOp: 'store' as GPUStoreOp,
                }],
            });
            pass.setPipeline(pipeline);
            pass.setVertexBuffer(0, vertexBuffer);
            pass.setIndexBuffer(indexBuffer, 'uint32');
            pass.setBindGroup(0, bindGroup);
            pass.drawIndexed(indices.length);
            pass.end();

            device.queue.submit([encoder.finish()]);
        };
    }

    private setCanvasSize() {
        const { canvas, xAxis, yAxis } = this.series;

        canvas.style.left = xAxis.toPixels(xAxis.toValue(0, true), false) + 'px';
        canvas.style.top = yAxis.toPixels(yAxis.toValue(0, true), false) + 'px';
        canvas.style.width = xAxis.len + 'px';
        canvas.style.height = yAxis.len + 'px';

        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }

    private getExtremes() {
        const { xAxis, yAxis } = this.series;

        return [
            xAxis.toValue(0, true), // xMin
            xAxis.toValue(xAxis.len, true), // xMax
            yAxis.toValue(yAxis.len, true), // yMin
            yAxis.toValue(0, true), // yMax
        ];
    }

    private getContourInterval() {
        const options = this.series.options as PlotHeatmapOptions;
        const interval = options.contour?.contourInterval;

        if (isNaN(interval) || interval <= 0) {
            return -1;
        }

        return interval;
    }

    private getSmoothColoring() {
        const options = this.series.options as PlotHeatmapOptions;
        return options.contour?.smoothColoring ? 1 : 0;
    }

    private getShowContourLines() {
        const options = this.series.options as PlotHeatmapOptions;
        return options.contour?.showContourLines ? 1 : 0;
    }

    /**
     * Set the contour interval uniform according to the series options and re-render the Contourmap if it is visible.
     */
    public setContourIntervalUniform() {
        this.device.queue.writeBuffer(
            this.contourIntervalUniformBuffer,
            0,
            new Float32Array([this.getContourInterval()]),
        );

        this.render?.();
    }

    /**
     * Set the smooth coloring uniform according to the series options and re-render the Contourmap if it is visible.
     */
    public setSmoothColoringUniform() {
        this.device.queue.writeBuffer(
            this.smoothColoringUniformBuffer,
            0,
            new Float32Array([this.getSmoothColoring()]),
        );

        this.render?.();
    }

    /**
     * Set the show contour lines uniform according to the series options and re-render the Contourmap if it is visible.
     */
    public setShowContourLinesUniform() {
        this.device.queue.writeBuffer(
            this.showContourLinesUniformBuffer,
            0,
            new Float32Array([this.getShowContourLines()]),
        );

        this.render?.();
    }

    private getColorAxisStopsData() : { array: Float32Array, length: number } {
        const colorAxis = this.series.colorAxis;

        if (!colorAxis) {
            return {
                array: new Float32Array([
                    0, 0, 0, 0,
                    1, 1, 1, 1,
                ]),
                length: 2,
            };
        }

        const flattenedData = new Float32Array(colorAxis.stops.map(stop => [
            stop[0],
            ...colorToArray(stop[1]),
        ]).flat());

        return {
            array: flattenedData,
            length: colorAxis.stops.length,
        };
    }

    private getDataExtremes() {
        const { series } = this;

        let min = series.valueMin;
        if (isNaN(min)) {
            min = series.colorAxis?.min;

            if (isNaN(min)) {
                min = Math.min(...series.points.map(point => point.value));
            }
        }

        let max = series.valueMax;
        if (isNaN(max)) {
            max = series.colorAxis?.max;

            if (isNaN(max)) {
                max = Math.max(...series.points.map(point => point.value));
            }
        }

        return [min, max];
    }

    /**
     * Set the extremes of the Contourmap axes.
     */
    public setExtremes() {
        if (!this.render) return;

        this.setCanvasSize();
        this.extremesUniform.set(this.getExtremes());
        this.device.queue.writeBuffer(this.extremesUniformBuffer, 0, this.extremesUniform);
        this.valueExtremesUniform.set(this.getDataExtremes());
        this.device.queue.writeBuffer(this.valueExtremesUniformBuffer, 0, this.valueExtremesUniform);
        this.render();
    }

    /**
     * Destroy the Contourmap instance.
     */
    public destroy() {
        this.series.canvas.remove();
    }
}
