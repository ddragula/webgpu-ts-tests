import type { HeatmapSeries } from './hc-modules/ContourModule';

import basicShader from './shaders/shader.wgsl';

/**
 * Contourmap rendering class.
 */
export default class Contourmap {
    private series: HeatmapSeries;
    private extremesUniform: Float32Array;
    private extremesUniformBuffer: GPUBuffer;

    private context: GPUCanvasContext;
    private device?: GPUDevice;
    private adapter?: GPUAdapter;

    public render?: (() => void);

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
        series.chart.container.prepend(canvas);

        this.context = canvas.getContext('webgpu');
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

        const vertices = new Float32Array([
            //x, y, axes-id x2
            -1, -1, 0, 2,
            1, -1, 1, 2,
            1, 1, 1, 3,
            -1, 1, 0, 3,
        ]);

        const indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3,
        ]);

        const extremesUniform = this.extremesUniform = new Float32Array([
            -2.5, 0.5, // x-axis
            -1.5, 1.5, // y-axis
        ]);

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

        device.queue.writeBuffer(vertexBuffer, 0, vertices);
        device.queue.writeBuffer(indexBuffer, 0, indices);
        device.queue.writeBuffer(extremesUniformBuffer, 0, extremesUniform);

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 16,
            attributes: [{
                format: 'float32x2',
                offset: 0,
                shaderLocation: 0,
            }, {
                format: 'float32x2',
                offset: Float32Array.BYTES_PER_ELEMENT * 2,
                shaderLocation: 1,
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
        });

        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: {
                    buffer: extremesUniformBuffer,
                },
            }],
        });

        this.render = function render() {
            const encoder = device.createCommandEncoder();

            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'clear' as GPULoadOp,
                    clearValue: [ 0, 0, 0, 1],
                    storeOp: 'store' as GPUStoreOp,
                }],
            });
            pass.setPipeline(pipeline);
            pass.setVertexBuffer(0, vertexBuffer);
            pass.setIndexBuffer(indexBuffer, 'uint16');
            pass.setBindGroup(0, bindGroup);
            pass.drawIndexed(indices.length);
            pass.end();

            device.queue.submit([encoder.finish()]);
        };
    }

    private setCanvasSize() {
        const { canvas } = this.series;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { xAxis } = this.series as any;

        canvas.style.left = xAxis.left + 'px';
        canvas.style.top = xAxis.top + 'px';
        canvas.style.width = xAxis.len + 'px';
        canvas.style.height = xAxis.height + 'px';

        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }

    /**
     * Set the extremes of the Contourmap axes.
     */
    public setExtremes() {
        if (!this.render) return;

        const { xAxis, yAxis } = this.series;
        this.setCanvasSize();

        this.extremesUniform.set([xAxis.min, xAxis.max, yAxis.min, yAxis.max]);
        this.device.queue.writeBuffer(this.extremesUniformBuffer, 0, this.extremesUniform);
        this.render();
    }

    /**
     * Destroy the Contourmap instance.
     */
    public destroy() {
        this.series.canvas.remove();
    }
}
