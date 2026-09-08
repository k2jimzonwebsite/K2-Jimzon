"""IDEA-20260905-01. Run in Blender via MCP. Creates a separate source scene.

Original K2 character art: no external models, textures, fonts or paid services.
Coordinates in helpers are metres, Y up, facing +Z (converted for Blender).
Exports named rigid joints for the storefront's interruptible pose controller.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
for previous in list(bpy.data.scenes):
    if previous.get('asset_id') == 'IDEA-20260905-01':
        for obj in list(previous.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.scenes.remove(previous)
scene = bpy.data.scenes.new('K2 Anime Clerk')
bpy.context.window.scene = scene

def xyz(p):
    return (p[0], -p[2], p[1])

def material(name, color, emission=0):
    m = bpy.data.materials.new('Anime_' + name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = .78
    p.inputs['Emission Color'].default_value = (*color, 1)
    p.inputs['Emission Strength'].default_value = emission
    return m

skin = material('Skin', (.88, .60, .40))
cream = material('Linen', (.88, .83, .70))
olive = material('Apron', (.20, .29, .12))
wine = material('Cap', (.30, .025, .055))
hair = material('Espresso', (.045, .018, .012))
sheen = material('Chestnut', (.16, .060, .022))
ink = material('Ink', (.012, .007, .009))
white = material('Ivory', (.98, .96, .88), .2)
gold = material('Gold', (.94, .66, .23), .15)
iris = material('Amber', (.44, .17, .025), .15)
blush = material('Blush', (.80, .29, .23))
denim = material('Denim', (.035, .055, .10))
mouth = material('Smile', (.28, .035, .045))

def joint(name, pos, parent=None):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = xyz(pos)
    obj['joint'] = name
    return obj

root = joint('ClerkRoot', (0, 0, 0))
body = joint('Body', (0, 0, 0), root)

def finish(obj, name, pos, mat, parent):
    obj.name = name
    obj.parent = parent
    obj.location = xyz(pos)
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj

def ellipsoid(name, pos, size, mat, parent=body):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16)
    obj = finish(bpy.context.object, name, pos, mat, parent)
    obj.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj

def box(name, pos, size, mat, parent=body, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = finish(bpy.context.object, name, pos, mat, parent)
    obj.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = obj.modifiers.new('Soft tailored edge', 'BEVEL')
    mod.width = bevel
    mod.segments = 3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def strand(name, points, radius, mat, parent, taper=False):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 12
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for i, (bp, point) in enumerate(zip(spline.bezier_points, points)):
        bp.co = xyz(point)
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
        bp.radius = max(.04, 1-i/(len(points)-1)) if taper else 1
    obj = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(obj)
    obj.parent = parent
    curve.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return obj

# Tailored silhouette, rolled sleeves and an apron with a pocket and brass straps.
ellipsoid('Blouse', (0, 1.10, 0), (.18, .25, .105), cream)
ellipsoid('Waist', (0, .85, 0), (.165, .115, .10), denim)
box('Apron skirt', (0, .89, .102), (.31, .31, .035), olive)
box('Apron bib', (0, 1.14, .101), (.21, .27, .03), olive)
box('Apron pocket', (0, .91, .127), (.16, .095, .018), olive, bevel=.01)
strand('Pocket seam', [(-.068,.93,.139),(0,.915,.14),(.068,.93,.139)], .002, gold, body)
box('Waist ribbon', (0, 1.015, .116), (.32, .032, .02), olive)
for side in [-1,1]:
    strand('Apron strap', [(side*.09,1.25,.10),(side*.12,1.29,.02),(side*.095,1.22,-.08)], .012, olive, body)
    box('Brass buckle', (side*.09,1.215,.126), (.027,.035,.012), gold, bevel=.005)
box('Name badge', (.05,1.17,.124), (.075,.027,.009), white, bevel=.004)
ellipsoid('Neck', (0,1.335,0), (.055,.085,.053), skin)
for side, label in [(-1,'Right'),(1,'Left')]:
    leg = joint(label+'Leg', (side*.084,.84,0), root)
    box('Trouser', (0,-.39,0), (.145,.76,.15), denim, leg, .05)
    box('Sneaker', (0,-.775,.045), (.14,.09,.245), white, leg, .04)
    box('Sole', (0,-.80,.045), (.145,.025,.25), cream, leg, .008)
    for i in range(3):
        box('Lace', (0,-.731,.07+i*.022), (.075,.006,.008), cream, leg, .002)
    arm = joint(label+'Arm', (side*.19,1.25,0), body)
    ellipsoid('Sleeve', (0,-.08,0), (.065,.13,.068), cream, arm)
    box('Cuff', (0,-.17,0), (.103,.042,.11), cream, arm)
    elbow = joint(label+'Elbow', (0,-.19,0), arm)
    ellipsoid('Forearm', (0,-.09,.01), (.039,.115,.043), skin, elbow)
    ellipsoid('Palm', (0,-.215,.014), (.043,.061,.025), skin, elbow)
    for finger in range(4):
        ellipsoid('Finger', ((finger-1.5)*.018,-.26,.016), (.011,.034-.004*abs(finger-1.5),.012), skin, elbow)
    ellipsoid('Thumb', (-side*.041,-.218,.022), (.015,.034,.018), skin, elbow)

head = joint('Head', (0,1.47,0), body)
# A broad upper face tapering to a chin: stylised adult, approximately five heads tall.
ellipsoid('Head shape', (0,.014,0), (.151,.182,.127), skin, head)
ellipsoid('Jaw', (0,-.087,.013), (.112,.086,.107), skin, head)
ellipsoid('Hair back', (0,.035,-.037), (.164,.192,.12), hair, head)
for side in [-1,1]:
    ellipsoid('Ear', (side*.15,-.026,.004), (.022,.04,.025), skin, head)
    strand('Side lock', [(side*.14,.11,.01),(side*.153,-.055,.025),(side*.13,-.21,.032),(side*.16,-.31,-.03)], .036, hair, head, True)
    strand('Long hair', [(side*.10,.08,-.09),(side*.16,-.15,-.11),(side*.12,-.34,-.12),(side*.16,-.49,-.07)], .070, hair, head, True)
    strand('Hair shine', [(side*.16,-.02,-.05),(side*.174,-.18,-.07),(side*.14,-.31,-.075)], .008, sheen, head, True)
    eyes = joint(('Right' if side<0 else 'Left')+'Eye', (side*.064,-.014,.115), head)
    ellipsoid('Eye liner', (0,0,0), (.055,.063,.014), ink, eyes)
    ellipsoid('Eye white', (0,-.004,.01), (.048,.054,.013), white, eyes)
    ellipsoid('Amber iris', (side*-.004,-.006,.022), (.032,.046,.009), iris, eyes)
    ellipsoid('Pupil', (side*-.004,-.001,.030), (.018,.032,.007), ink, eyes)
    ellipsoid('Eye glint', (-.012,.019,.036), (.012,.015,.005), white, eyes)
    ellipsoid('Eye glint small', (.015,-.026,.034), (.006,.008,.004), gold, eyes)
    strand('Lash', [(side*.038,.036,.008),(side*.059,.055,.007),(side*.066,.069,.006)], .007, ink, eyes, True)
    strand('Brow', [(side*.027,.068,.113),(side*.060,.080,.117),(side*.103,.070,.1)], .006, hair, head, True)
    ellipsoid('Cheek', (side*.100,-.085,.090), (.028,.013,.005), blush, head)
    # Swept, tapered bangs stop above the eyebrows.
    strand('Fringe', [(side*.11,.11,.03),(side*.09,.09,.116),(side*.13,.050,.10)], .029, hair, head, True)
ellipsoid('Nose', (0,-.055,.123), (.014,.021,.018), skin, head)
smile = joint('Mouth', (0,-.115,.107), head)
ellipsoid('Smile', (0,0,0), (.031,.015,.006), mouth, smile)
box('Smile teeth', (0,.005,.005), (.041,.008,.004), white, smile, .003)

# Cap front faces the customer; raised K2 lettering survives glTF without fonts.
ellipsoid('Cap crown', (0,.168,-.013), (.178,.083,.146), wine, head)
ellipsoid('Cap brim', (0,.118,.128), (.166,.013,.119), wine, head)
box('Cap patch', (0,.169,.127), (.104,.058,.014), cream, head, .012)
font = bpy.data.curves.new('K2 lettering', 'FONT')
font.body = 'K2'
font.align_x = 'CENTER'
font.align_y = 'CENTER'
font.size = .050
font.extrude = .0008
font.bevel_depth = .0003
letters = bpy.data.objects.new('K2_Cap_Lettering', font)
scene.collection.objects.link(letters)
letters.parent = head
letters.location = xyz((0,.169,.139))
letters.rotation_euler = (math.pi/2,0,0)
font.materials.append(wine)
bpy.context.view_layer.objects.active = letters
letters.select_set(True)
bpy.ops.object.convert(target='MESH')
letters.select_set(False)

# Join static meshes by joint/material to keep draw calls bounded.
for parent in [o for o in scene.objects if o.type == 'EMPTY']:
    meshes = [o for o in parent.children if o.type == 'MESH']
    if len(meshes) < 2:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    bpy.context.object.name = parent.name + '_Geometry'

scene['asset_id'] = 'IDEA-20260905-01'
scene['description'] = 'Original K2 adult anime clerk; rigid named joints; no commerce state.'
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    obj.select_set(True)
output = ROOT / 'public/models/k2-clerk-anime.glb'
output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_animations=False,export_yup=True)

# Studio camera/lights are saved with the source but excluded from the GLB.
bpy.ops.object.camera_add(location=(2.3,-4.8,2.0))
camera = bpy.context.object
camera.rotation_euler = (Vector((0,0,.9))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 2.1
scene.camera = camera
for location, energy, size in [((2,-3,4),180,4),((-2,-2,2),90,3),((0,2,3),170,3)]:
    bpy.ops.object.light_add(type='AREA',location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = size
    light.rotation_euler = (Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 800
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'
scene.world = bpy.data.worlds.new('K2 Studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.4,.4,.4,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .35
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/3d/k2-clerk-anime.blend'))
print('K2 anime clerk exported:', output, output.stat().st_size, 'bytes')
