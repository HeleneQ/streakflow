# streakflow
Semester project for Browser programming course


## FrontEnd





## BackEnd

### Databases - SQL

We might need two tables to store and complete the created habits:
- first one to store the habits
- second one to track habits daily completions

First table named "habits":

```sql
create table habits (
    habit_id bigserial primary key,

    habit_name text not null,

    created_at timestamp default now()
);
```

This table create an habit with a name, an id (int) to represent this habit and its date of creation.

Second table named "habit_daily_completions":

```sql
create table habit_daily_completions (
    completion_id bigserial primary key,

    habit_id bigserial references habits(habit_id) on delete cascade,

    completion_date date not null,

    is_completed boolean not null default false,

    created_at timestamp default now(),

    constraint unique_habit_date
    unique (habit_id, completion_date)
);
```

Chaque ligne a un identifiant unique, auto-incrémenté. On fait le lien vers la table habits avec habit_id. completion_date stocke le jour où a été fait l'habitude, on stocke uniquement le jour. is_completed indique si l'habitude est faite ou non (on pourrait bien évidemment uniquement stocker les jours faits). On ajoute la date et l'heure d'ajout dans la base.