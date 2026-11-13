-- The original constraint already guarantees stable cs/en values for existing rows.
alter table quizzes add column source text;
alter table quizzes add column is_hidden boolean not null default false;
alter table quizzes drop constraint quizzes_language_check;
alter table quizzes add constraint quizzes_language_check check (language ~ '^[a-z]{2}$');
