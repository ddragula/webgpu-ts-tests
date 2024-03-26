import './style.css';
import * as Highcharts from 'highcharts';
import Mandelbrot from './Mandelbrot';

interface MandelbrotChart extends Highcharts.Chart {
    canvas?: HTMLCanvasElement;
    mandelbrot?: Mandelbrot;
}

Highcharts.chart('chart', {
    chart: {
        width: 800,
        height: 800,
        backgroundColor: 'transparent',
        zooming: {
            type: 'xy',
        },
        animation: false,
        events: {
            render: async function() {
                const chart = this as MandelbrotChart;

                if (!chart.mandelbrot) {
                    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
                    chart.canvas = canvas;
                    chart.mandelbrot = new Mandelbrot(chart.canvas);
                    await chart.mandelbrot.run();
                }

                chart.mandelbrot.setExtremes(chart);
            },
        },
    },
    title: {
        text: 'Mandelbrot Set',
    },
    xAxis: {
        min: -2.5,
        max: 0.5,
        gridLineWidth: 0,
        title: {
            text: '',
        },
    },
    yAxis: {
        min: -1.5,
        max: 1.5,
        gridLineWidth: 0,
        title: {
            text: '',
        },
    },
    series: [{
        type: 'line',
        data: [],
        showInLegend: false,
    }],
});
