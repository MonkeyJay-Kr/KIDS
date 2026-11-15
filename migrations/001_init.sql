create table if not exists albums (
  id text primary key,
  baby_name text not null,
  birthday date not null,
  invite_code text not null unique,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id text primary key,
  album_id text not null references albums(id) on delete cascade,
  user_sub text not null,
  display_name text not null,
  role text not null check (role in ('owner', 'family')),
  joined_at timestamptz not null default now(),
  unique (album_id, user_sub)
);

create index if not exists members_user_sub_idx on members (user_sub);

create table if not exists photos (
  id text primary key,
  album_id text not null references albums(id) on delete cascade,
  uploader_sub text not null,
  uploader_name text not null,
  caption text not null default '',
  taken_at date not null,
  image_data text not null,
  created_at timestamptz not null default now()
);

create index if not exists photos_album_taken_idx on photos (album_id, taken_at desc);

create table if not exists likes (
  photo_id text not null references photos(id) on delete cascade,
  user_sub text not null,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_sub)
);

create table if not exists comments (
  id text primary key,
  photo_id text not null references photos(id) on delete cascade,
  user_sub text not null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_photo_idx on comments (photo_id, created_at asc);
