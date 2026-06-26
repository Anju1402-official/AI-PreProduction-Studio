-- AI Pre-Production Studio -- PostgreSQL schema
-- Generated from SQLAlchemy models in backend/app/models/ via
-- SQLAlchemy's own DDL compiler -- this is exactly what
-- Base.metadata.create_all(bind=engine) executes against Postgres.
-- The backend creates this schema automatically on startup; treat
-- this file as a reference, or a starting point for a manual
-- migration tool if you'd rather not rely on create_all in prod.

CREATE TYPE plantype AS ENUM ('creator', 'professional', 'studio');
CREATE TYPE scriptstatus AS ENUM ('uploaded', 'processing', 'completed', 'failed');

CREATE TABLE users (
	id SERIAL NOT NULL, 
	name VARCHAR NOT NULL, 
	email VARCHAR NOT NULL, 
	hashed_password VARCHAR NOT NULL, 
	plan_type plantype, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_users_id ON users (id);

CREATE TABLE scripts (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	title VARCHAR NOT NULL, 
	description TEXT, 
	file_path VARCHAR, 
	status scriptstatus, 
	pipeline_stage VARCHAR, 
	error_message TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE INDEX ix_scripts_id ON scripts (id);

CREATE TABLE analysis_results (
	id SERIAL NOT NULL, 
	script_id INTEGER NOT NULL, 
	analysis_type VARCHAR NOT NULL, 
	result_data JSON, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(script_id) REFERENCES scripts (id)
);

CREATE INDEX ix_analysis_results_id ON analysis_results (id);

CREATE TABLE scenes (
	id SERIAL NOT NULL, 
	script_id INTEGER NOT NULL, 
	scene_number INTEGER NOT NULL, 
	heading VARCHAR, 
	location VARCHAR, 
	time_of_day VARCHAR, 
	action_lines TEXT, 
	importance_score FLOAT, 
	importance_category VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(script_id) REFERENCES scripts (id)
);

CREATE INDEX ix_scenes_id ON scenes (id);

CREATE TABLE characters (
	id SERIAL NOT NULL, 
	scene_id INTEGER NOT NULL, 
	script_id INTEGER NOT NULL, 
	name VARCHAR NOT NULL, 
	normalized_name VARCHAR NOT NULL, 
	source VARCHAR NOT NULL, 
	is_speaking BOOLEAN NOT NULL, 
	mention_count INTEGER NOT NULL, 
	screen_time FLOAT, 
	dialogue_percentage FLOAT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(scene_id) REFERENCES scenes (id), 
	FOREIGN KEY(script_id) REFERENCES scripts (id)
);

CREATE INDEX ix_characters_normalized_name ON characters (normalized_name);
CREATE INDEX ix_characters_id ON characters (id);

CREATE TABLE dialogues (
	id SERIAL NOT NULL, 
	scene_id INTEGER NOT NULL, 
	script_id INTEGER NOT NULL, 
	character_name VARCHAR NOT NULL, 
	normalized_character_name VARCHAR NOT NULL, 
	dialogue_text TEXT NOT NULL, 
	word_count INTEGER, 
	emotion VARCHAR, 
	emotion_score FLOAT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(scene_id) REFERENCES scenes (id), 
	FOREIGN KEY(script_id) REFERENCES scripts (id)
);

CREATE INDEX ix_dialogues_normalized_character_name ON dialogues (normalized_character_name);
CREATE INDEX ix_dialogues_id ON dialogues (id);

CREATE TABLE scene_emotions (
	id SERIAL NOT NULL, 
	scene_id INTEGER NOT NULL, 
	script_id INTEGER NOT NULL, 
	joy FLOAT NOT NULL, 
	fear FLOAT NOT NULL, 
	sadness FLOAT NOT NULL, 
	anger FLOAT NOT NULL, 
	tension FLOAT NOT NULL, 
	dominant_emotion VARCHAR, 
	model_name VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (scene_id), 
	FOREIGN KEY(scene_id) REFERENCES scenes (id), 
	FOREIGN KEY(script_id) REFERENCES scripts (id)
);

CREATE INDEX ix_scene_emotions_id ON scene_emotions (id);

CREATE TABLE storyboard_panels (
	id SERIAL NOT NULL, 
	scene_id INTEGER NOT NULL, 
	script_id INTEGER NOT NULL, 
	panel_number INTEGER NOT NULL, 
	shot_type VARCHAR NOT NULL, 
	camera_angle VARCHAR NOT NULL, 
	composition_notes TEXT NOT NULL, 
	key_visual_elements TEXT, 
	mood_lighting VARCHAR, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (scene_id), 
	FOREIGN KEY(scene_id) REFERENCES scenes (id), 
	FOREIGN KEY(script_id) REFERENCES scripts (id)
);

CREATE INDEX ix_storyboard_panels_id ON storyboard_panels (id);

