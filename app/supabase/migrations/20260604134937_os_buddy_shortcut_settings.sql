alter table public.profiles
add column if not exists os_buddy_shortcut_settings jsonb default '{
  "desktopToggle": {
    "key": " ",
    "code": "Space",
    "label": "Space",
    "modifiers": {
      "ctrl": false,
      "alt": false,
      "shift": false,
      "meta": false
    },
    "pressCount": 2
  },
  "twoFingerDoubleTapEnabled": true
}'::jsonb;

update public.profiles
set os_buddy_shortcut_settings = '{
  "desktopToggle": {
    "key": " ",
    "code": "Space",
    "label": "Space",
    "modifiers": {
      "ctrl": false,
      "alt": false,
      "shift": false,
      "meta": false
    },
    "pressCount": 2
  },
  "twoFingerDoubleTapEnabled": true
}'::jsonb
where os_buddy_shortcut_settings is null;

comment on column public.profiles.os_buddy_shortcut_settings
is 'Cross-device OS Buddy global toggle shortcut settings.';
