import type { Chart } from 'highcharts';

import basicShader from './shaders/shader.wgsl';

/**
 * Mandelbrot set rendering class.
 */
export default class Mandelbrot {
    private canvas: HTMLCanvasElement;
    private render?: (() => void);

    private device: GPUDevice;
    private extremesUniform: Float32Array;
    private extremesUniformBuffer: GPUBuffer;

    /**
     * Creates an instance of the App.
     * @param canvas - canvas HTML Element
     */
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    /**
     * An asynchronous method that runs the renderer.
     */
    async run() {
        const { canvas } = this;
        const adapter = await navigator.gpu.requestAdapter();
        const device = this.device = await adapter.requestDevice();
        const context = canvas.getContext('webgpu');
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

    private setCanvasSize(chart: Chart) {
        const { canvas } = this;
        canvas.style.left = chart.plotLeft + 'px';
        canvas.style.top = chart.plotTop + 'px';
        canvas.style.width = chart.plotWidth + 'px';
        canvas.style.height = chart.plotHeight + 'px';
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }

    /**
     * Set the extremes of the Mandelbrot set axes.
     * @param xAxisMin - Minimum value of the x-axis
     * @param xAxisMax - Maximum value of the x-axis
     * @param yAxisMin - Minimum value of the y-axis
     * @param yAxisMax - Maximum value of the y-axis
     */
    public setExtremes(chart: Chart) {
        if (!this.render) return;

        const xAxis = chart.xAxis[0];
        const yAxis = chart.yAxis[0];

        this.setCanvasSize(chart);

        this.extremesUniform.set([xAxis.min, xAxis.max, yAxis.min, yAxis.max]);
        this.device.queue.writeBuffer(this.extremesUniformBuffer, 0, this.extremesUniform);
        this.render();
    }
}
