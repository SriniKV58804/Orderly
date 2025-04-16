-- Update tasks table to make course_id nullable
alter table tasks alter column course_id drop not null;