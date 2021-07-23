create table jobs (id int, email varchar, company varchar);

create table messages (id int, type varchar, value varchar, job_id int, datetime date, sender varchar);

create table facts (id int, job_id int, value varchar);

create table users (id int, username varchar, hashed_password varchar, current_session varchar);