import basicShader from './shaders/shader.wgsl';
import computeShader from './shaders/computeShader.wgsl';

const GRID_SIZE = 100;
const UPDATE_INTERVAL = 100;
const WORKGROUP_SIZE = 8;

/**
 * Main application class.
 */
export default class App {
    private canvas: HTMLCanvasElement;
    private step: number = 0;

    /**
     * Creates an instance of the App.
     * @param canvas - canvas HTML Element
     */
    constructor(canvas: HTMLCanvasElement) {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        this.canvas = canvas;
    }


    /**
     * An asynchronous method that runs the app.
     */
    async run() {
        const { canvas } = this;
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();
        const context = canvas.getContext('webgpu');
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device: device,
            format: canvasFormat,
        });

        const vertices = new Float32Array([
            -0.8, -0.8,
            0.8, -0.8,
            0.8,  0.8,

            -0.8, -0.8,
            0.8,  0.8,
            -0.8,  0.8,
        ]);
        const vertexBuffer = device.createBuffer({
            label: 'Cell vertices',
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(vertexBuffer, 0, vertices);

        const vertexBufferLayout: GPUVertexBufferLayout = {
            arrayStride: 8,
            attributes: [{
                format: 'float32x2' as GPUVertexFormat,
                offset: 0,
                shaderLocation: 0,
            }],
        };

        const bindGroupLayout = device.createBindGroupLayout({
            label: 'Cell Bind Group Layout',
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                buffer: {},
            }, {
                binding: 1,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                buffer: { type: 'read-only-storage' as GPUBufferBindingType },
            }, {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: { type: 'storage' as GPUBufferBindingType },
            }],
        });

        const pipelineLayout = device.createPipelineLayout({
            label: 'Cell pipeline layout',
            bindGroupLayouts: [bindGroupLayout],
        });

        const cellShaderModule = device.createShaderModule({
            label: 'Cell shader',
            code: basicShader,
        });

        const cellPipeline = device.createRenderPipeline({
            label: 'Cell pipeline',
            layout: pipelineLayout,
            vertex: {
                module: cellShaderModule,
                entryPoint: 'vertexMain',
                buffers: [vertexBufferLayout],
            },
            fragment: {
                module: cellShaderModule,
                entryPoint: 'fragmentMain',
                targets: [{
                    format: canvasFormat,
                }],
            },
        });

        const simulationShaderModule = device.createShaderModule({
            label: 'Game of Life simulation shader',
            code: computeShader.replace(/\$wgs/g, WORKGROUP_SIZE.toString()),
        });

        const simulationPipeline = device.createComputePipeline({
            label: 'Simulation pipeline',
            layout: pipelineLayout,
            compute: {
                module: simulationShaderModule,
                entryPoint: 'computeMain',
            },
        });

        const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
        const uniformBuffer = device.createBuffer({
            label: 'Grid Uniforms',
            size: uniformArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

        const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
        const cellStateStorage = [
            device.createBuffer({
                label: 'Cell State A',
                size: cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
            device.createBuffer({
                label: 'Cell State B',
                size: cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            }),
        ];

        for (let i = 0; i < cellStateArray.length; i += 3) {
            cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
        }
        device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);

        const bindGroups = [
            device.createBindGroup({
                label: 'Cell renderer bind group A',
                layout: bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: uniformBuffer },
                }, {
                    binding: 1,
                    resource: { buffer: cellStateStorage[0] },
                }, {
                    binding: 2,
                    resource: { buffer: cellStateStorage[1] },
                }],
            }),
            device.createBindGroup({
                label: 'Cell renderer bind group B',
                layout: bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: uniformBuffer },
                }, {
                    binding: 1,
                    resource: { buffer: cellStateStorage[1] },
                }, {
                    binding: 2,
                    resource: { buffer: cellStateStorage[0] },
                }],
            }),
        ];

        const updateGrid = () => {
            const encoder = device.createCommandEncoder();
            const computePass = encoder.beginComputePass();

            computePass.setPipeline(simulationPipeline);
            computePass.setBindGroup(0, bindGroups[this.step % 2]);
            const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);
            computePass.dispatchWorkgroups(workgroupCount, workgroupCount);
            computePass.end();

            this.step++;

            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    loadOp: 'clear' as GPULoadOp,
                    storeOp: 'store' as GPUStoreOp,
                    clearValue: [0, 0, 0.4, 1],
                }],
            });

            pass.setPipeline(cellPipeline);
            pass.setBindGroup(0, bindGroups[this.step % 2]);
            pass.setVertexBuffer(0, vertexBuffer);
            pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE);

            pass.end();
            device.queue.submit([encoder.finish()]);
        };

        setInterval(updateGrid, UPDATE_INTERVAL);
    }
}
