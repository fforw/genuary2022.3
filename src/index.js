import domready from "domready"
import SimplexNoise from "simplex-noise"
import "./style.css"
import { clamp } from "./util";
import AABB from "./AABB";
import randomPalette from "./randomPalette";
import Color from "./Color";

const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;
const DEG2RAD_FACTOR = TAU / 360;

const config = {
    width: 0,
    height: 0
};

/**
 * @type CanvasRenderingContext2D
 */
let ctx;
let canvas;

let angle = 0

let noise


function lifeSpan()
{
    return 10 + Math.random() * 5
}


const black = new Color(0,0,0)
let particles, palette, bgColor, planet, moon;

function shuffle(a) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

class RandomOrder
{
    palette = null
    pos = 0

    constructor(palette)
    {
        this.palette = palette.slice()
    }

    next()
    {
        this.pos++;
        if (this.pos >= palette.length)
        {
            this.pos = 0;
        }

        return this.palette[this.pos];
    }
}




function paintMoon(color, color2)
{
}


class Body
{
    x;
    y;
    radius;
    col0;
    col1;
    angle;
    distance;

    constructor(col0, col1, angle = (x,y) => TAU/4, size = 1)
    {
        const {width, height} = config

        this.col0 = col0;
        this.col1 = col1;

        this.col2 = Color.from(col0).mix(Color.from(col1), 0.5).toRGBHex()

        const cx = width/2
        const cy = height/2

        const max = Math.max(width, height) / 2;
        const radius = 0 | (max / 4 * Math.random() + max / 3) * size;
        const distance = 0 | (radius * Math.random() + radius);

        this.radius = radius
        this.distance = distance

        this.angle = TAU * Math.random()

        this.x = cx + Math.cos(this.angle) * distance
        this.y = cy + Math.sin(this.angle) * distance
        const a = angle(this.x, this.y)

        const gradient = ctx.createLinearGradient(
            radius + Math.cos(a) * radius,
            radius + Math.sin(a) * radius,
            radius + Math.cos(a + TAU/2) * radius,
            radius + Math.sin(a + TAU/2) * radius,
        );
        gradient.addColorStop(0, col0)
        gradient.addColorStop(1, col1)

        const canvas = document.createElement("canvas")

        canvas.width = radius * 2
        canvas.height = radius * 2

        const tmpCtx = canvas.getContext("2d");
        tmpCtx.clearRect(0,0, radius * 2, radius * 2)

        tmpCtx.fillStyle = gradient
        tmpCtx.beginPath()
        tmpCtx.moveTo(radius + radius, radius)
        tmpCtx.arc(radius, radius, radius, 0, TAU, true)
        tmpCtx.fill()

        this.canvas = canvas
    }

    paint()
    {
        const { canvas, x, y, radius } = this
        ctx.drawImage(canvas, x - radius, y - radius)

    }
}



domready(
    () => {

        canvas = document.getElementById("screen");
        ctx = canvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;

        const cx = width/2
        const cy = height/2

        function init()
        {
            noise = new SimplexNoise()
            
            palette = randomPalette()

            const count = 500;

            particles = new Array(count)
            for (let i = 0; i < count; i++)
            {

                let age = lifeSpan();
                particles[i] = {
                    x: width * Math.random(),
                    y: height * Math.random(),
                    vdx: 0,
                    vdy: 0,
                    color: palette[0 | Math.random() * palette.length],
                    life: 0 | (age * Math.random()),
                    size: (1 + Math.random() * 2) | 0
                }
            }

            const fullBG = Color.from(palette[0 | Math.random() * palette.length]).mix(black, 0.9);
            ctx.fillStyle = fullBG.toRGBHex()
            ctx.fillRect(0, 0, width, height)
            bgColor = fullBG.toRGBA(0.015)

            const order = new RandomOrder(palette)

            planet = new Body(order.next(),order.next())

            const v = 0|((0.1  + Math.random() * 0.3) * 255)
            const grey = new Color(v,v,v)

            moon = new Body(
                Color.from(order.next()).mix(grey, 0.7).toRGBHex(),
                planet.col2,
                (mx,my) => Math.atan2(my - planet.y, mx - planet.x),
                0.33
            )

        }


        init();

        const ns0 = 0.0007;
        const inertia = 0.5

        let zPos = 0


        function paint()
        {
            for (let i = 0; i < particles.length; i++)
            {
                let particle = particles[i];
                let { x, y, vdx, vdy, color, size} = particle;


                const curlFactor = 3
                const e = 0.01;
                const  n1 = noise.noise3D(   x * ns0    , y * ns0 + e, zPos);
                const  n2 = noise.noise3D(   x * ns0    , y * ns0 - e, zPos);
                const  n5 = noise.noise3D(x * ns0 + e,        y * ns0, zPos);
                const  n6 = noise.noise3D(x * ns0 - e,        y * ns0, zPos);

                let dx = n2 - n1
                let dy = n6 - n5;

                const f = curlFactor/Math.sqrt(dx*dx+dy*dy);

                vdx = vdx * inertia + dx * f * (1 - inertia)
                vdy = vdy * inertia + dy * f * (1 - inertia)


                ctx.fillStyle = color
                ctx.fillRect(x - size/2, y - size/2, size, size)

                particle.x += vdx
                particle.y += vdy

                particle.vdx = vdx
                particle.vdy = vdy
                particle.life--

                if (particle.life <= 0)
                {
                    particle.x = width * Math.random()
                    particle.y = height * Math.random()

                    particle.vdx = 0
                    particle.vdy = 0

                    particle.color = palette[0|Math.random() * palette.length]
                    particle.life = lifeSpan()
                }
            }

            ctx.fillStyle = bgColor
            ctx.fillRect(0, 0, width, height)

            planet.paint()
            moon.paint()


            angle += 0.01
            zPos += 0.0003

            requestAnimationFrame(paint)
        }
        requestAnimationFrame(paint)

        window.addEventListener("click", init, true)
    }
);
