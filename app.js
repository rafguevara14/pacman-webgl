/** @type {WebGLRenderingContext} */
var gl
var canvas;
var score = 0;

var clock = 60;

/* Game state */
var gameFinished = false
var ghostMakeMove = false;
var gameStarted = false
var gamePaused = false

var invincibleCounter = 0

const ghostHitPointLoss = 1000
const pelletPoints = 50

var endGame = () =>  {}
var pauseGame = () =>  {}

function updateText(scorecolor=null) {
	if (scorecolor == -1)
	{
		document.getElementById("menuStatistics").innerHTML = parseInt(clock) 
		+ "&nbsp".repeat(48) + "<span style='color: red;'>" + score + " </span>";
	}
	else if(scorecolor == 1)
	{
		document.getElementById("menuStatistics").innerHTML = parseInt(clock) 
		+ "&nbsp".repeat(48) + "<span style='color: #1DD117;'>" + score + " </span>";
	}
	else if (scorecolor == 0)
	{
		console.log("text black!")
		document.getElementById("menuStatistics").innerHTML = "<span style='color: black;'>" 
		+ parseInt(clock) + " </span>" + "&nbsp".repeat(48) + "<span style='color: black;'>"
		+ score + " </span>";
	}
	else{
		document.getElementById("menuStatistics").innerHTML = parseInt(clock) 
		+ "&nbsp".repeat(48) + score
	}
}

function onTimer(){

	if (gameFinished == true)
	{
		endGame()
	}
	else if (gameFinished == false && clock == 0)
	{
		gameFinished = true;
	}

	if(gameFinished == false)
	{
		clock -= 0.5
	}

	updateText()
}

function onGhostMove(){
	ghostMakeMove = true;
}

const ghostMoveInterval = 300
var movetimer = setInterval(onGhostMove, ghostMoveInterval)
var timer = setInterval(onTimer, 500);

pauseGame = () => { 
	console.log("Pausing game...");
	gamePaused = true
	ghostMakeMove=false;
	clearInterval(timer);
	clearInterval(movetimer) 
}

function addScore(points){
	if (gameFinished == false)
	{
		score += points;
		points < 0 ? updateText(-1) : updateText(1)
	}

	if (score <= 0)
	{
		console.log("Game over!")
		gameFinished = true
	}
}

endGame = () => {
	gameFinished = true
	pauseGame();
	console.log("Game finished!");
	addScore(clock*100)
}

function resumeGame() {
	if (gamePaused)
	{
		updateText()
		gameFinished = false
		gamePaused = false
		console.log("Resuming game!")
		movetimer = setInterval(onGhostMove, ghostMoveInterval)
		timer = setInterval(onTimer, 500);
	}
}


function largest_square(sx=1.0, sy=1.0){
	return [
		vec2( 1.0*sx,  1.0*sy),
		vec2(-1.0*sx, -1.0*sy),
		vec2(-1.0*sx,  1.0*sy), // shared diagonal
		vec2( 1.0*sx,  1.0*sy), // shared diagonal
		vec2(-1.0*sx, -1.0*sy),
		vec2( 1.0*sx, -1.0*sy)
	];
}

const get_absolute_position = (positions, translation) => {
	
	var absolute = []

	positions.forEach(
		(pos) => {
			absolute.push(vec2(pos[0]+translation[0], pos[1]+translation[1]))
		}
	)

	return absolute
}

function create_static_shape(color=null, positions=null, translation=null, numVertices=null){
	return {
		vshader: './shaders/shape.vert', 
		fshader: './shaders/shape.frag',
		numVertices: numVertices,
		translation: translation,
		initial_translation: translation,
		positions: positions,
		absolute_positions: get_absolute_position(positions, translation),
		color: Array(numVertices).fill(color),
		pBuffer: null,
		vao: null,
		program: null,
	};
}

const create_wall = (color, scale, translation) => 
	
	create_static_shape(
		color,
		largest_square(scale[0], scale[1]),
		translation,
		6
	)

const create_dash = (scale, translation) => 
	create_static_shape(
		vec4(0.0, 0.0, 1.0, 1.0),
		largest_square(scale[0], scale[1]),
		translation,
		6
	)

const green_wall_color = vec4(0.5, 0.8, 0.4, 1.0)
const blue_bounds_distance = 0.88

var ceiling_floor_squares = (xreflection, yreflection) => create_wall(
	 	green_wall_color,
		vec2(0.25, 0.15),
		vec2(xreflection*0.4, yreflection*0.53),
)

var inner_walls = [
	// center green walls
	create_wall(
		green_wall_color,
		vec2(0.09, 0.17),
		vec2(0.55, 0.0),
	),
	create_wall(
		green_wall_color,
		vec2(0.09, 0.17),
		vec2(-0.55, 0.0),
	),
	
	// green walls
	ceiling_floor_squares( 1.0, 1.0),
	ceiling_floor_squares( 1.0, -1.0),
	ceiling_floor_squares( -1.0, 1.0),
	ceiling_floor_squares( -1.0, -1.0),
] 

var walls = [ 

	// outer gray wall
	create_wall(
		vec4(0.0, 0.0, 0.0, 0.5),
		vec2(1.0, 1.0), 
		vec2(0.0, 0.0),
	),

	//outer blue bounds
	create_wall(
		vec4(0.0, 0.2, 1.0, 1.0),
		vec2(blue_bounds_distance, blue_bounds_distance),
		vec2(0.0, 0.0),
	),

	// grey arena
	create_wall(
		vec4(0.8, 0.8, 0.8, 1.0),
		vec2(0.86, 0.86),
		vec2(0.0, 0.0),
	),

	...inner_walls
]

function get_rectangular_bounding_box(shape){

	var xdist_from_center = Math.abs(shape.positions[0][0])
	var ydist_from_center = Math.abs(shape.positions[0][1])

	var xtrans = shape.translation[0]
	var ytrans = shape.translation[1]

	const tolerance = 0.001

	return {
		xmin: -xdist_from_center + xtrans - tolerance,  
		xmax: xdist_from_center + xtrans + tolerance,
		ymin: -ydist_from_center + ytrans - tolerance,
		ymax: ydist_from_center + ytrans + tolerance
	}
}

var wall_bounding_boxes = inner_walls.map(get_rectangular_bounding_box)

const horizontal_dash = (translation) => create_dash(vec2(0.02, 0.002), translation)
const vertical_dash = (translation) => create_dash(vec2(0.002, 0.02), translation)

const horizontal_radius = 0.17
const vertical_radius = 0.07

var dashes = [
	vertical_dash(vec2(vertical_radius, 0.15)),
	vertical_dash(vec2(vertical_radius, 0.10)),
	vertical_dash(vec2(vertical_radius, 0.05)),
	vertical_dash(vec2(vertical_radius, 0.0)),
	vertical_dash(vec2(vertical_radius, -0.05)),
	vertical_dash(vec2(vertical_radius, -0.10)),
	vertical_dash(vec2(vertical_radius, -0.15)),

	vertical_dash(vec2(-vertical_radius, 0.15)),
	vertical_dash(vec2(-vertical_radius, 0.10)),
	vertical_dash(vec2(-vertical_radius, 0.05)),
	vertical_dash(vec2(-vertical_radius, 0.0)),
	vertical_dash(vec2(-vertical_radius, -0.05)),
	vertical_dash(vec2(-vertical_radius, -0.10)),
	vertical_dash(vec2(-vertical_radius, -0.15)),

	horizontal_dash(vec2(0.05, horizontal_radius)),
	horizontal_dash(vec2(0.0,   horizontal_radius)),
	horizontal_dash(vec2(-0.05, horizontal_radius)),
	
	horizontal_dash(vec2(0.05, -horizontal_radius)),
	horizontal_dash(vec2(0.0,   -horizontal_radius)),
	horizontal_dash(vec2(-0.05, -horizontal_radius)),
]

const radius = 0.02
const theta_step = Math.PI/12
const iterations = [...Array(2*Math.PI/theta_step).keys()].map((x)=>x+1)

function create_pellet(translation){

	var pellet = []
	
	iterations.map(
		(n) => {
			// create triangle
			pellet.push(
				...[
					vec2(radius*Math.cos(n*theta_step), radius*Math.sin(n*theta_step)),
					vec2(radius*Math.cos((n-1)*theta_step), radius*Math.sin((n-1)*theta_step)),
					vec2(0, 0)
				]
			)

		}
	)

	return create_static_shape(
		vec4(0.9, 0.8, 0.1, 1.0), //color
		pellet,
		translation,
		iterations.length*3
	)
			
}

const pdistance_from_blue = 0.1
const pellet_distances = 0.1;

function matrix_vector_mult(mat, v){
	
	var result = []
	mat.forEach(
		(row) => {
			result.push(row[0] * v[0] + row[1] * v[1]);
		}
	)
	return result;
}



const all_pellets = [
	//bottom row
	create_pellet(vec2(0.15, -blue_bounds_distance+pdistance_from_blue)), 
	create_pellet(vec2(0.3, -blue_bounds_distance+pdistance_from_blue)), 
	create_pellet(vec2(0.45, -blue_bounds_distance+pdistance_from_blue)), 
	create_pellet(vec2(0.6, -blue_bounds_distance+pdistance_from_blue)), 
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue)), 

	create_pellet(vec2(-0.15, -blue_bounds_distance+pdistance_from_blue)), 
	create_pellet(vec2(-0.3, -blue_bounds_distance+pdistance_from_blue)), 
	create_pellet(vec2(-0.45, -blue_bounds_distance+pdistance_from_blue)), 
	create_pellet(vec2(-0.6, -blue_bounds_distance+pdistance_from_blue)), 
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue)), 

	// left row
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue+0.15)), 
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue+0.3)), 
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue+0.45)), 
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue+0.6)), 
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue+0.75)), 
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue+0.9)), 
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue+1.05)), 
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue+1.2)), 
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue+1.35)), 
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue+1.5)), 

	// right row
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue+0.15)), 
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue+0.3)), 
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue+0.45)), 
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue+0.6)), 
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue+0.75)), 
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue+0.9)), 
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue+1.05)), 
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue+1.2)), 
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue+1.35)), 
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue+1.5)),

	// top row 
	create_pellet(vec2(0.15, -blue_bounds_distance+pdistance_from_blue+1.5)), 
	create_pellet(vec2(0.3, -blue_bounds_distance+pdistance_from_blue+1.5)), 
	create_pellet(vec2(0.45, -blue_bounds_distance+pdistance_from_blue+1.5)), 
	create_pellet(vec2(0.6, -blue_bounds_distance+pdistance_from_blue+1.5)), 
	create_pellet(vec2(0.75, -blue_bounds_distance+pdistance_from_blue+1.5)), 
	create_pellet(vec2(-0.15, -blue_bounds_distance+pdistance_from_blue+1.5)), 
	create_pellet(vec2(-0.3, -blue_bounds_distance+pdistance_from_blue+1.5)), 
	create_pellet(vec2(-0.45, -blue_bounds_distance+pdistance_from_blue+1.5)), 
	create_pellet(vec2(-0.6, -blue_bounds_distance+pdistance_from_blue+1.5)), 
	create_pellet(vec2(-0.75, -blue_bounds_distance+pdistance_from_blue+1.5)), 


	// top upside down T
	create_pellet(vec2(0.0, -blue_bounds_distance+pdistance_from_blue+1.5)), 
	create_pellet(vec2(0.0, -blue_bounds_distance+pdistance_from_blue+1.35)), 
	create_pellet(vec2(0.0, -blue_bounds_distance+pdistance_from_blue+1.2)), 

	// second row from the top
	create_pellet(vec2(0.15, -blue_bounds_distance+pdistance_from_blue+1.05)), 
	create_pellet(vec2(0.3, -blue_bounds_distance+pdistance_from_blue+1.05)), 
	create_pellet(vec2(0.45, -blue_bounds_distance+pdistance_from_blue+1.05)), 
	create_pellet(vec2(0.6, -blue_bounds_distance+pdistance_from_blue+1.05)), 

	create_pellet(vec2(-0.15, -blue_bounds_distance+pdistance_from_blue+1.05)), 
	create_pellet(vec2(-0.3, -blue_bounds_distance+pdistance_from_blue+1.05)), 
	create_pellet(vec2(-0.45, -blue_bounds_distance+pdistance_from_blue+1.05)), 
	create_pellet(vec2(-0.6, -blue_bounds_distance+pdistance_from_blue+1.05)), 

	// two middle rectangles
	create_pellet(vec2(0.15, -blue_bounds_distance+pdistance_from_blue+0.6)), 
	create_pellet(vec2(0.15, -blue_bounds_distance+pdistance_from_blue+0.75)), 
	create_pellet(vec2(0.15, -blue_bounds_distance+pdistance_from_blue+0.9)), 
	create_pellet(vec2(0.15, -blue_bounds_distance+pdistance_from_blue+1.05)), 
	create_pellet(vec2(-0.15, -blue_bounds_distance+pdistance_from_blue+0.6)), 
	create_pellet(vec2(-0.15, -blue_bounds_distance+pdistance_from_blue+0.75)), 
	create_pellet(vec2(-0.15, -blue_bounds_distance+pdistance_from_blue+0.9)), 
	create_pellet(vec2(-0.15, -blue_bounds_distance+pdistance_from_blue+1.05)), 

	create_pellet(vec2(0.3, -blue_bounds_distance+pdistance_from_blue+1.05)), 
	create_pellet(vec2(0.3, -blue_bounds_distance+pdistance_from_blue+0.9)), 
	create_pellet(vec2(0.3, -blue_bounds_distance+pdistance_from_blue+0.75)), 
	create_pellet(vec2(-0.3, -blue_bounds_distance+pdistance_from_blue+1.05)), 
	create_pellet(vec2(-0.3, -blue_bounds_distance+pdistance_from_blue+0.9)), 
	create_pellet(vec2(-0.3, -blue_bounds_distance+pdistance_from_blue+0.75)), 
	create_pellet(vec2(0.3, -blue_bounds_distance+pdistance_from_blue+0.6)), 
	create_pellet(vec2(-0.3, -blue_bounds_distance+pdistance_from_blue+0.6)), 

	// second row from bottom 
	create_pellet(vec2(0.15, -blue_bounds_distance+pdistance_from_blue+0.45)), 
	create_pellet(vec2(0.3, -blue_bounds_distance+pdistance_from_blue+0.45)), 
	create_pellet(vec2(0.45, -blue_bounds_distance+pdistance_from_blue+0.45)), 
	create_pellet(vec2(0.60, -blue_bounds_distance+pdistance_from_blue+0.45)), 

	create_pellet(vec2(-0.15, -blue_bounds_distance+pdistance_from_blue+0.45)), 
	create_pellet(vec2(-0.3, -blue_bounds_distance+pdistance_from_blue+0.45)), 
	create_pellet(vec2(-0.45, -blue_bounds_distance+pdistance_from_blue+0.45)), 
	create_pellet(vec2(-0.60, -blue_bounds_distance+pdistance_from_blue+0.45)), 

	// up from pacman 
	create_pellet(vec2(0.0, -blue_bounds_distance+pdistance_from_blue+0.15)), 
	create_pellet(vec2(0.0, -blue_bounds_distance+pdistance_from_blue+0.3)), 
	create_pellet(vec2(0.0, -blue_bounds_distance+pdistance_from_blue+0.45)), 

]

var pellets = all_pellets.concat() // copy pellets

function place_special_pellet(){

	// pick a random pellet to remove
	var random_index = (Math.floor(Math.random() * pellets.length))
	var special_pellet = pellets[random_index]
	pellets.splice(random_index, 1);

	// take the properties of the random pellet and turn into special pellet color
	var ret = create_pellet(special_pellet.translation);
	ret.color = Array(ret.numVertices).fill(vec4(1.0, 1.0, 0.2, 1.0))
	return ret
} 

var special_pellets = [place_special_pellet()]

const get_empty_inputs = () => {
	return {
		ArrowUp: 0.0,
		ArrowDown: 0.0,
		ArrowLeft: 0.0,
		ArrowRight: 0.0,
	}
} 

var inputs = get_empty_inputs()

var pacman = 
	create_static_shape(
		vec4(0.5, 0.6, 0.8, 1.0),
		[
			vec2(0.0, 0.05),
			vec2(0.025, 0.0),
			vec2(-0.025, 0.0)
		],
		vec2(0.0, -blue_bounds_distance+pdistance_from_blue-0.01),
		6
	)

// overwrite default shaders and use special pacman shaders 
// (pacman needs to change colors at runtime when a special pellet is consumed)
pacman.vshader = './shaders/pacman.vert'
pacman.fshader = './shaders/pacman.frag'

var ghosts = [
	// red ghost
	create_wall(
		vec4(0.7, 0.3, 0.5, 1.0),
		vec2(0.025, 0.025),
		vec2(0.0, -blue_bounds_distance+pdistance_from_blue+0.9)
	),
	// blue ghost
	create_wall(
		vec4(0.5, 0.7, 1.0, 1.0),
		vec2(0.025, 0.025),
		vec2(0.0,-blue_bounds_distance+pdistance_from_blue+0.75)
	)
]

function resetGame() {

	pauseGame()

	ghosts.forEach(
		(ghost) => {
			updatePlayerPosition(ghost, ghost.initial_translation)
		}			
	)

	updatePlayerPosition(pacman, pacman.initial_translation)

	clock = 60
	score = 0
	updateText()

	ghostMakeMove = false
	invincibleCounter = 0

	// reset and re-place special pellet
	pellets = all_pellets.concat()
	pellets.forEach(createShape);
	special_pellets = [place_special_pellet()]
	special_pellets.forEach(createShape)

	// ensure pacman power up is inactive
	clearInterval(pacmanPowerUpTimer)
	resetPacmanColor()

	gameStarted = false
}

const getKey = (key) => { 

	if (key.shiftKey && key.key == 'R')
	{
		console.log("Reset game!")

		resetGame()

	} else if (gamePaused == false && key.key == 'p')
	{
		pauseGame()

	} else if (gameStarted == false && key.key == 's')
	{
		resumeGame()
		
		gameStarted = true

	} else if (key.key == 'r' && gameFinished == false && gameStarted == true)
	{
		resumeGame()
	}
	else
	{
		// put key into inputs dictionary 
		inputs[key.key] = pellet_distances; 
	}

}

window.addEventListener("keydown", getKey, false);

function initializeContext(){
	canvas = document.getElementById("myCanvas");
	gl = canvas.getContext("webgl2");

	const pixelRatio = window.devicePixelRatio || 1;

    // using clientWidth and clientHeight
    canvas.width = pixelRatio * canvas.clientWidth;
    canvas.height = pixelRatio * canvas.clientHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0, 0, 0, 0);

    gl.lineWidth(1.0);

	gl.enable(gl.DEPTH_TEST);

    console.log("WebGL initialized.");
}

function createShape(shape){
	// position buffer
	var position_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(shape.positions)), gl.STATIC_DRAW);

	// color buffer
	var color_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(shape.color)), gl.STATIC_DRAW);

	// initialize shaders
	var program = initShaders(gl, shape.vshader, shape.fshader);
	gl.useProgram(program)

	// create vertex array object
	var vao = gl.createVertexArray()
	gl.bindVertexArray(vao)
	var posAttribLoc = gl.getAttribLocation(program, "pos")
	gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer)
	gl.enableVertexAttribArray(posAttribLoc)
	gl.vertexAttribPointer(posAttribLoc, 2, gl.FLOAT, false, 0, 0)

	var colorAttribLoc = gl.getAttribLocation(program, "color")
	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer)
	gl.enableVertexAttribArray(colorAttribLoc)
	gl.vertexAttribPointer(colorAttribLoc, 4, gl.FLOAT, false, 0, 0)

	var translationLoc = gl.getUniformLocation(program, "translation")
	gl.uniform2f(translationLoc, shape.translation[0], shape.translation[1])

	// cache values when time to render 
	shape.pBuffer = position_buffer;
	shape.vao = vao;
	shape.program = program;
	shape.translationLoc = translationLoc;
}

function drawShape(shape){
	gl.useProgram(shape.program);
	gl.bindVertexArray(shape.vao); 
	gl.bindBuffer(gl.ARRAY_BUFFER, shape.pBuffer);

	gl.drawArrays(gl.TRIANGLES, 0, shape.numVertices);
}

/* Collision Detection Logic */

const collided = (x, y, box) => box.xmin < x && x < box.xmax && box.ymin < y && y < box.ymax

const grey_bounds = (x, y) => {
	var ret = false
	if(Math.abs(x) > 0.83 || Math.abs(y) > 0.83){
		console.log("Out of bounds!")
		ret = true;
	} 
	return ret;
}

const dashed_area = (x, y) => {
	var ret = false
	if (Math.abs(x) < vertical_radius && Math.abs(y) < horizontal_radius+0.01){
		console.log("Dash collision!")
		ret = true
	}
	return ret
}

const green_bounds = (x,y) => {
	var ret = false
	inner_walls.map(get_rectangular_bounding_box).forEach( (box) => { if (collided(x,y,box)) {console.log("Wall collision!");ret=true} })
	return ret
}

function isCollision(potential_position, collision_detections){

	var collision = false;

	for (var i = 0; i < potential_position.length; i++)
	{
		var x = potential_position[i][0]
		var y = potential_position[i][1]

		for (var d = 0; d < collision_detections.length; d++)
		{
			var collision = collision_detections[d](x,y)
			if (collision == true)
			{
				return true
			}
		}


	}

	return collision;
}

function pelletAcquired(x, y, shape){
	var dist_between_points = vec2(x-shape.translation[0], y- shape.translation[1])

	var mag = Math.sqrt(dist_between_points.map((v)=>Math.pow(v, 2)).reduce((acc, a)=> acc+a))
	
	return mag < radius+0.05
}

var pacmanPowerUpTimer;
var pacman_powerup_color_state = 0

function updatePellets(potential_positions){

	potential_positions.forEach(
		(absolute) => {
			var x = absolute[0]
			var y = absolute[1]

			for (var p = 0; p < pellets.length; p++)
			{
				var shape = pellets[p];

				if (pelletAcquired(x,y,shape))
				{
					// remove pellet
					pellets.splice(p, 1);
					
					addScore(pelletPoints);
					
					if (pellets.length == 0)
					{
						gameFinished = true;
					}

					break;
				}
			} // normal pellets


			// special pellet(s)
			for (var s = 0; s < special_pellets.length; s++)
			{
				var sp = special_pellets[s];

				if (pelletAcquired(x,y,sp))
				{
					// remove pellet
					special_pellets.splice(s, 1);
					
					invincibleCounter += 1

					pacmanPowerUpTimer = setInterval(
						() => {
							
							gl.useProgram(pacman.program);
							if (pacman_powerup_color_state == 0)
							{
								gl.uniform4f(pacman.pacColorLoc, 1.0, 0.0, 0.0, 1.0)
							}
							else if (pacman_powerup_color_state == 1)
							{
								gl.uniform4f(pacman.pacColorLoc, 0.0, 1.0, 0.0, 1.0)	
								
							}
							else if (pacman_powerup_color_state == 2)
							{
								gl.uniform4f(pacman.pacColorLoc, 0.0, 0.0, 1.0, 1.0)	
								// resets to zero at the end of the function 
								pacman_powerup_color_state = -1
							}

							pacman_powerup_color_state += 1
						}
					, 50)
					
					break;
				}
			} // special pellet(s)
		}
	)
}


// this needs to be 10*the actual step wanted
const vertical_step = 1.5
const horizontal_step = 1.5

const get_translation_mat = (inputs) => {
	return [
		vec2(-horizontal_step*inputs.ArrowLeft, horizontal_step*inputs.ArrowRight), 
		vec2(-vertical_step*inputs.ArrowDown, vertical_step*inputs.ArrowUp)
	]
}

function updatePlayerPosition(player, translation) {

	player.absolute_positions = get_absolute_position(player.positions, translation)
	player.translation = translation

	gl.useProgram(player.program);
	gl.uniform2f(player.translationLoc, translation[0], translation[1])
}

function drawPlayer(player, translation_matrix, collision_detections){

	gl.useProgram(player.program);
	gl.bindVertexArray(player.vao); 
	gl.bindBuffer(gl.ARRAY_BUFFER, player.pBuffer);

	var translation = matrix_vector_mult(translation_matrix, vec2(1.0, 1.0))

	var potential_translation = vec2(player.translation[0] + translation[0], player.translation[1] + translation[1] )
	var potential_positions = get_absolute_position(player.positions, potential_translation)

	var collision = isCollision(potential_positions, collision_detections) 
	
	if (gamePaused == false && gameFinished == false && collision == false) 
	{
		updatePlayerPosition(player, potential_translation)
	}

	gl.drawArrays(gl.TRIANGLES, 0, player.numVertices);
}

function determineGhostMovement(ghost, direct_luck, direction_luck){

	var inputs = get_empty_inputs()

	var xdist =  pacman.translation[0] - ghost.translation[0]
	var ydist =  pacman.translation[1] - ghost.translation[1]

	var correctmaxcomponent = Math.random() < direct_luck
	var correctdirection = Math.random() < direction_luck

	var maxdist = correctmaxcomponent ? Math.max(xdist, ydist) : Math.min(xdist, ydist) 

	if (correctdirection == false)
	{
		xdist  *= -1
		ydist *= -1
	}

	var moveMagnitude = pellet_distances

	if (maxdist == xdist)
	{
		if(xdist < 0) { inputs.ArrowLeft = moveMagnitude }
		else { inputs.ArrowRight = moveMagnitude }
	}
	else
	{
		if(ydist < 0) { inputs.ArrowDown = moveMagnitude }
		else { inputs.ArrowUp = moveMagnitude }
	}

	return inputs
}


function resetPacmanColor() {
	gl.useProgram(pacman.program)
	// all vertices have the same color; choose a random one as reference
	gl.uniform4f( pacman.pacColorLoc, pacman.color[0][0], pacman.color[0][1], pacman.color[0][2], pacman.color[0][3])
}

function ghostCollision()
{
	if (gamePaused == true)
	{
		return
	}

	ghosts.forEach(
		(ghost) => {
			var ghost_collision = (x,y) => collided(x, y, get_rectangular_bounding_box(ghost))
			if (isCollision(pacman.absolute_positions, [ghost_collision])){
				
				var pauseTime;

				if (invincibleCounter > 0)
				{
					invincibleCounter -= 1
					clearInterval(pacmanPowerUpTimer)
					resetPacmanColor()
					pauseTime = 300
				}
				else
				{
					addScore(-ghostHitPointLoss);
					pauseTime = 500
				}

				// add a pause effect to emphasize collisions; set a timeout for when to resume game
				pauseGame(); 
				setTimeout(()=>
				{
					// only resume ghost if game is not done
					if (gameFinished == false)
					{
						updatePlayerPosition(ghost, ghost.initial_translation)
						resumeGame();
					}
				}, pauseTime)
			}
		}
	)

}

function drawPlayers(){

	var ghost_one_move = get_empty_inputs()
	var ghost_two_move = get_empty_inputs()

	if (ghostMakeMove)
	{
		ghost_one_move = determineGhostMovement(ghosts[0], 0.6, 1.0)
		ghost_two_move = determineGhostMovement(ghosts[1], 0.3, 0.5)

		ghostMakeMove = false
	}

	drawPlayer(ghosts[0], get_translation_mat(ghost_one_move), [grey_bounds, green_bounds])
	drawPlayer(ghosts[1], get_translation_mat(ghost_two_move), [grey_bounds, green_bounds])

	drawPlayer(pacman, get_translation_mat(inputs), [grey_bounds, green_bounds, dashed_area])
	updatePellets(pacman.absolute_positions);

	ghostCollision()

	// reset inputs
	for (var key in inputs){
		inputs[key] = 0.0
	}

}


function createPacman(){
	// position buffer
	var position_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(pacman.positions)), gl.STATIC_DRAW);

	// initialize shaders
	var program = initShaders(gl, pacman.vshader, pacman.fshader);
	gl.useProgram(program)

	// create vertex array object
	var vao = gl.createVertexArray()
	gl.bindVertexArray(vao)
	var posAttribLoc = gl.getAttribLocation(program, "pos")
	gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer)
	gl.enableVertexAttribArray(posAttribLoc)
	gl.vertexAttribPointer(posAttribLoc, 2, gl.FLOAT, false, 0, 0)

	// add pacman uniform 
	var pacColorLoc = gl.getUniformLocation(program, "pacColor")

	var translationLoc = gl.getUniformLocation(program, "translation")
	gl.uniform2f(translationLoc, pacman.translation[0], pacman.translation[1])

	// cache values when time to render 
	pacman.pBuffer = position_buffer;
	pacman.vao = vao;
	pacman.program = program;
	pacman.translationLoc = translationLoc;
	pacman.pacColorLoc = pacColorLoc

	resetPacmanColor()
}

async function setup() {
	updateText()

    initializeContext();

	// draw in reverse order
	walls.reverse();
	walls.forEach(createShape);
	dashes.forEach(createShape);
	pellets.forEach(createShape);
	special_pellets.forEach(createShape)
	createPacman();

	ghosts.forEach(createShape)

	pauseGame();
	
	render();
};

// Draws the vertex data.
async function render() {

	drawPlayers();
	dashes.forEach(drawShape);
	special_pellets.forEach(drawShape)
	pellets.forEach(drawShape)
	walls.forEach(drawShape);


	requestAnimationFrame(render);
}

window.onload = setup

