#version 300 es

layout(location=0) in vec2 pos;
layout(location=1) in vec4 color;

uniform vec2 translation;

out vec4 fColor;

void main(){
	gl_Position = vec4(pos, 0.0, 1.0) + vec4(translation, 0.0, 0.0);
	fColor = color;
}