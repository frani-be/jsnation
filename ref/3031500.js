/* Created for #WCCChallenge "Jewel"

This sketch renders a rhombic dodecahedron with reflections of the Lancellotti Chapel in Italy.

AI Disclosure: I ported the Bending Light sketch to p5.js a long time ago, but since there is no cubeMap in p5, I used a 2D image texture.
While this worked, the background looked wonky. This time, I asked chatGPT if there was a way to duplicate the
cubeMap in shaderToy and it walked me through the steps to create one. It first tested whether this was possible by 
generating a colored cubeMap (function in colorCubemap.js.) Once we verified that it was possible to pass the generated cubeMap
to the shader, it created the functions to upload the images and bind them to the cubeMap. It also provided a function to create a cubemap
from a framebuffer, although that is not going to look as seemless. 

Note: OPC palette options are not working and I am not sure why

Sources:
The image for the cubeMap is from humus:
https://www.humus.name/index.php?page=Textures
https://www.humus.name/index.php?page=Textures&start=24
The image loaded into the framebuffer is from NASA:
https://images.nasa.gov/details/PIA14874
crystalFrag adapted from:
Live Coding Bending Light tutorial https://www.youtube.com/watch?v=0RWaR7zApEo
by Martijn Steinrucken aka The Art of Code/BigWings - 2021
https://www.shadertoy.com/view/sllGDN
https://iquilezles.org/articles/distfunctions/
*/

let myShader;
let cubeTexture;
let cubeImages = []
let S, fb1, fb2, px, nx, py, ny, pz, nz, img;
let wMargin, hMargin;
let rows = 3;
let cols = 4;
//let palette;

let myPalettes = [
	["#f94144", "#f3722c", "#f8961e", "#f9844a", "#f9c74f", "#90be6d", "#43aa8b", "#4d908e", "#577590", "#277da1"],
	["#d9ed92", "#b5e48c", "#99d98c", "#76c893", "#52b69a", "#34a0a4", "#168aad", "#1a759f", "#1e6091", "#184e77"],
	["#ff6d00", "#ff5400", "#ff8500", "#ff9e00", "#240046", "#3c096c", "#5a189a", "#7b2cbf", "#9d4edd", "#184e77"],
	["#54478c", "#2c699a", "#048ba8", "#0db39e", "#16db93", "#83e377", "#efea5a", "#f1c453", "#f29e4c", "#184e77"],
	["#ffffad", "#ffff5c", "#ffee33", "#ffda47", "#ffc60a", "#901447", "#c21e65", "#e02a7a", "#fd358f", "#fd5da5"],
	["#011a51", "#1957db", "#487bea", "#7ea3f1", "#c8d7f9", "#b83700", "#f06c00", "#fab129", "#fde9c3", "#fd5da5"],
	["#797d62", "#9b9b7a", "#baa587", "#d9ae94", "#f1dca7", "#ffcb69", "#e8ac65", "#d08c60", "#b58463", "#997b66"],
	["#8ecae6", "#73bfdc", "#58b4d1", "#219ebc", "#126782", "#023047", "#ffb703", "#fd9e02", "#fb8500", "#fb9017"],
	["#baebff", "#bbdbfe", "#bccbfd", "#bebcfc", "#bfacfb", "#c09cfa", "#c18cf9", "#c37df8", "#c46df7", "#c55df6"],
	["#114b5f", "#106776", "#0f838d", "#0e9fa4", "#0cbaba", "#07bad5", "#01baef", "#029ccc", "#027da9", "#035e86"]
]
OPC.palette('palette', myPalettes);

OPC.select('renderOptions', {
	"cubeMap": 0,
	"image": 1,
	"grid": 2
});

async function setup() {
	S = min(windowWidth, windowHeight)
	let perimeter = 2 * windowWidth + 2 * windowHeight;
	s = floor(perimeter / 14);
	if (windowWidth > windowHeight) {
		w = ~~S * 4 / 3;
		h = S;
	} else {
		w = S;
		h = ~~S * 3 / 4;

	}

	wMargin = floor((w - 4 * s) / 2);
	hMargin = floor((h - 3 * s) / 2);
	//createCanvas(S, S, WEBGL);
	createCanvas(windowWidth, windowHeight, WEBGL);

	pixelDensity(1);
	noStroke();

	fb1 = createFramebuffer({
		width: S,
		height: S,
		format: FLOAT,
		textureFiltering: NEAREST
	});

	fb2 = createFramebuffer({
		width: s * 4,
		height: s * 3,
		format: FLOAT,
		textureFiltering: NEAREST
	});

	cellSize = s;

	grid = new Grid()

	// Load images for cube map; images MUST be square and same size
	px = await loadImage("posx.jpg"); // +X
	nx = await loadImage("negx.jpg"); // -X
	py = await loadImage("posy.jpg"); // +Y
	ny = await loadImage("negy.jpg"); // -Y
	pz = await loadImage("posz.jpg"); // +Z
	nz = await loadImage("negz.jpg"); // -Z

	img = await loadImage("stars.jpg")

	// Make sure we actually have WebGL2
	const gl = drawingContext;
	//console.log("WebGL2:", gl instanceof WebGL2RenderingContext);

	myShader = await createShader(vert, crystalFrag)

	addFramebuffer()
	addGridFramebuffer()

	chooseRenderOption()
}

function chooseRenderOption() {
	const gl = drawingContext;
	if (renderOptions === 0) {
		cubeTexture = createCubeMap(gl);
	} else if (renderOptions === 1) {
		cubeTexture = createCubeMapFromFB(fb1)
	} else if (renderOptions === 2) {
		cubeTexture = createCubeMapFromFB(fb2)
	}
}

function draw() {
	clear()
	
	shader(myShader);

	myShader.setUniform("u_resolution", [width, height]);
	myShader.setUniform('u_mouse', [mouseX, map(mouseY, 0, height, height, 0)]);
	myShader.setUniform('u_time', millis() / 1000.);
	myShader.setUniform('u_tex', img);

	// Bind our native cube texture
	bindCubeMap(cubeTexture);

	rect(-width / 2, -height / 2, width, height);
}

function parameterChanged(variableName, value) {
	if (variableName = "renderOption") {
		chooseRenderOption()
	}
}

function addFramebuffer() {
	// image framebuffer
	fb1.begin()
	clear()
	imageMode(CENTER)
	image(img, 0, 0, fb1.width, fb1.height)
	fb1.end()
}

// grid framebuffer where you can add with custom design
// I have added something very simple just to test
function addGridFramebuffer() {
	fb2.begin()
	clear()
	//palette = random(myPalettes)
	push()
	translate(-width / 2, -height / 2)
	background(palette[0]);
	grid.renderGrid();
	pop()
	fb2.end()
}