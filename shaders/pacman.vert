#version 300 es

layout(location=0) in vec2 pos;

uniform vec2 translation;

uniform vec4 pacColor;
out vec4 fColor;

void main(){
	gl_Position = vec4(pos, 0.0, 1.0) + vec4(translation, 0.0, 0.0);
	fColor = pacColor;
}