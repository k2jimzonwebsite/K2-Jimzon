# K2 cartoon clerk — IDEA-20260905-01 / MAP-027

`k2-clerk-anime.blend` is the editable original source;
`../../public/models/k2-clerk-anime.glb` is the browser export. The original
`k2-clerk.blend` / GLB, counter props and hero crate are separate existing work.
Do not overwrite them when revising this character.

To regenerate in Blender's Python console or the authorized Blender MCP:

```python
from pathlib import Path
script = Path(r'C:\Users\jerze\K2 JImzon\scripts\build-anime-clerk.py')
exec(compile(script.read_text(encoding='utf-8'), str(script), 'exec'), {'__file__': str(script)})
```

The script replaces only the generated scene tagged `IDEA-20260905-01`, creates
original geometry/materials, exports its selected active scene with Y-up and
joint extras, then saves a studio camera/light setup in the source. It uses
Blender's built-in font for raised K2 lettering converted to geometry. It calls
no external asset service and has no baked animation. `clerkPoses.js` and
`AnimeClerk.jsx` own runtime poses. Edit the script as well as regenerating the
asset so future builds can reproduce the change. Blender `.blend1` files are
local previous-save backups, not the runtime export.

The current GLB is 1,137,508 bytes, 12 joint markers, 11 meshes and 32 material
primitives. `tests/map027-clerk-workflow.spec.js` checks its format, budget,
complete articulation and lack of external dependencies/studio objects.
`renders/k2-clerk-anime.png` is a Blender studio render inspected on 5 September
2026; it does not establish in-store mobile framing or animation acceptance.

For visual rollback, restore the ShelfScene3D import to `StoreKeeper3D` while
preserving unrelated room/CounterProps work. For remaining acceptance and exact
verification evidence, use the owning MAP-027 item in `MASTER_ACTION_PLAN.md`;
this file is asset documentation, not a separate backlog.
