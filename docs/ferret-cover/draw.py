# Hand-drawn cut-paper cover for the Ferret post: four worktree cards whose
# threads gather into one shared index board with a few terracotta matches.
import random, math
random.seed(11)
W, H = 1536, 1024
IVORY, CHAR, TERRA, SLATE = '#F6F2EA', '#2A2926', '#C2633F', '#4E5763'
out = []
a = out.append

a(f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
  <filter id="torn" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="4" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="fibre" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" seed="9" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="cut" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="2" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="7"/>
    <feOffset dx="5" dy="10" result="b"/>
    <feFlood flood-color="#3B2E22" flood-opacity="0.26"/>
    <feComposite in2="b" operator="in" result="s"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="1.4"/>
    <feOffset dx="1" dy="2" result="b2"/>
    <feFlood flood-color="#2A2018" flood-opacity="0.30"/>
    <feComposite in2="b2" operator="in" result="s2"/>
    <feMerge><feMergeNode in="s"/><feMergeNode in="s2"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="lift" x="-30%" y="-30%" width="170%" height="180%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
    <feOffset dx="6" dy="11" result="b"/>
    <feFlood flood-color="#2A1F16" flood-opacity="0.38"/>
    <feComposite in2="b" operator="in" result="s"/>
    <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="low" x="-10%" y="-10%" width="120%" height="130%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="2.2"/>
    <feOffset dx="2" dy="4" result="b"/>
    <feFlood flood-color="#2A1F16" flood-opacity="0.22"/>
    <feComposite in2="b" operator="in" result="s"/>
    <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="thread" x="-10%" y="-20%" width="120%" height="140%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/>
    <feOffset dx="3" dy="6" result="b"/>
    <feFlood flood-color="#1E1712" flood-opacity="0.30"/>
    <feComposite in2="b" operator="in" result="s"/>
    <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.30  0 0 0 0 0.26  0 0 0 0 0.20  0.42 0 0 0 -0.16"/>
  </filter>
  <filter id="mottle" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="3" seed="3"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.48  0 0 0 0 0.38  0.22 0 0 0 -0.08"/>
  </filter>
  <filter id="fleck" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.22 0.6" numOctaves="2" seed="21"/>
    <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0.9 0 0 -0.52"/>
  </filter>
</defs>
<rect width="{W}" height="{H}" fill="{IVORY}"/>
''')

def torn_layer(points, fill, rim='#FBF8F1'):
    d = 'M' + ' L'.join(f'{x:.0f},{y:.0f}' for x, y in points) + ' Z'
    a(f'<g filter="url(#shadow)"><g filter="url(#torn)">'
      f'<path d="{d}" fill="{rim}" filter="url(#fibre)" transform="translate(0,-5)"/>'
      f'<path d="{d}" fill="{fill}"/></g></g>')

def wave(x0, x1, base, amp, n, seed):
    rnd = random.Random(seed)
    pts = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        y = base + amp * math.sin(i * 0.9 + seed) + rnd.uniform(-amp * 0.4, amp * 0.4)
        pts.append((x, y))
    return pts

# Background torn layers, echoing the series' hills.
torn_layer(wave(-40, 640, 150, 20, 10, 1) + [(700, 90), (760, -40), (-40, -40)], '#ECE6DA')
torn_layer(wave(-40, 1600, 900, 26, 16, 2) + [(1600, 1100), (-40, 1100)], '#E7E0D3')
torn_layer([(560, 1100), (700, 1010)] + wave(860, 1600, 952, 18, 9, 5) + [(1600, 1100)], '#D3CEC4')
torn_layer([(-40, 820), (120, 800), (260, 850), (380, 930), (470, 1000), (520, 1100), (-40, 1100)], SLATE)
torn_layer([(1180, -40), (1600, -40), (1600, 170), (1480, 150), (1380, 110), (1290, 60)], '#E6E0D4')

# The shared index: a slate board of paper tiles.
BX, BY, T, G, N = 948, 250, 64, 12, 6
side = N * T + (N - 1) * G
pad = 30
a(f'<g transform="rotate(-1.2 1172 474)">')
a(f'<g filter="url(#shadow)"><g filter="url(#cut)"><rect x="{BX - pad}" y="{BY - pad}" width="{side + 2 * pad}" '
  f'height="{side + 2 * pad}" rx="5" fill="{SLATE}"/></g></g>')
tones = ['#F1EBDF', '#E8E0D2', '#F6F1E7', '#DED6C7']
hits = {(1, 3), (2, 0), (3, 4), (4, 2), (5, 5)}
lifted = []
for r in range(N):
    for c in range(N):
        x, y = BX + c * (T + G), BY + r * (T + G)
        rot = random.uniform(-2.2, 2.2)
        cx, cy = x + T / 2, y + T / 2
        if (r, c) in hits:
            lifted.append((x - 3, y - 5, rot, cx, cy))
            continue
        a(f'<g filter="url(#low)"><g filter="url(#cut)" transform="rotate({rot:.1f} {cx} {cy})">'
          f'<rect x="{x}" y="{y}" width="{T}" height="{T}" rx="2.5" fill="{random.choice(tones)}"/></g></g>')
for x, y, rot, cx, cy in lifted:
    a(f'<g filter="url(#lift)"><g filter="url(#cut)" transform="rotate({rot * 1.6:.1f} {cx} {cy})">'
      f'<rect x="{x}" y="{y}" width="{T}" height="{T}" rx="2.5" fill="{TERRA}"/></g></g>')

a('</g>')

# Four worktree cards on the left, each with a few strips of text-like paper.
cards = [(300, 214, -5.5), (262, 404, 3.0), (312, 594, -2.5), (270, 782, 4.5)]
CW, CH = 250, 142
starts = []
for i, (cx, cy, rot) in enumerate(cards):
    x, y = cx - CW / 2, cy - CH / 2
    rnd = random.Random(40 + i)
    strips = []
    hit_row = [1, 2, 0, 2][i]
    for k in range(4):
        sy = y + 28 + k * 25
        sw = rnd.uniform(0.45, 0.85) * (CW - 52)
        indent = 26 + (18 if k in (1, 2) and rnd.random() < 0.6 else 0)
        col = TERRA if k == hit_row else ('#59606A' if k % 2 == 0 else '#8A8F95')
        strips.append(f'<rect x="{x + indent:.0f}" y="{sy:.0f}" width="{sw:.0f}" height="9" rx="4.5" fill="{col}"/>')
        if k == hit_row:
            hx, hy = x + indent + sw, sy + 4.5
    a(f'<g filter="url(#shadow)"><g filter="url(#cut)" transform="rotate({rot} {cx} {cy})">'
      f'<rect x="{x}" y="{y}" width="{CW}" height="{CH}" rx="4" fill="#FBF8F1"/>{"".join(strips)}</g></g>')
    # where the thread leaves the card, rotated with it
    th = math.radians(rot)
    px, py = x + CW - 6, hy
    dx, dy = px - cx, py - cy
    starts.append((cx + dx * math.cos(th) - dy * math.sin(th), cy + dx * math.sin(th) + dy * math.cos(th)))

# Threads: twisted charcoal cord gathering into one knot at the board's edge.
KX, KY = 884, 512
for i, (sx, sy) in enumerate(starts):
    ey = KY - 9 + i * 6
    c1 = (sx + 170, sy + [60, -50, 40, -70][i])
    c2 = (KX - 230, ey + (sy - KY) * 0.18 + [-30, 25, -20, 30][i])
    d = f'M{sx:.0f},{sy:.0f} C{c1[0]:.0f},{c1[1]:.0f} {c2[0]:.0f},{c2[1]:.0f} {KX:.0f},{ey:.0f}'
    def bez(t, p0=(sx, sy), p1=c1, p2=c2, p3=(KX, ey)):
        u = 1 - t
        x = u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]
        return x, y
    pts = [bez(k / 2000) for k in range(2001)]
    twists, acc, last = [], 0.0, pts[0]
    for p in pts[1:]:
        acc += math.dist(p, last)
        if acc >= 4.6:
            acc = 0.0
            ang = math.atan2(p[1] - last[1], p[0] - last[0]) + math.radians(52)
            hx, hy = 3.6 * math.cos(ang), 3.6 * math.sin(ang)
            twists.append(f'M{p[0] - hx:.1f},{p[1] - hy:.1f}L{p[0] + hx:.1f},{p[1] + hy:.1f}')
        last = p
    a(f'<g filter="url(#thread)"><path d="{d}" fill="none" stroke="{CHAR}" stroke-width="6.8" stroke-linecap="round"/>'
      f'<path d="{"".join(twists)}" stroke="#77726A" stroke-width="1.7" stroke-linecap="round" opacity="0.9"/></g>')
# small terracotta pin where the threads meet the index
a(f'<g filter="url(#lift)"><g filter="url(#cut)"><circle cx="{KX + 6}" cy="{KY}" r="27" fill="{TERRA}"/></g></g>')

# A terracotta sun, as in the rest of the series.
a(f'<g filter="url(#shadow)"><g filter="url(#cut)"><circle cx="1452" cy="128" r="58" fill="#C9734F"/></g></g>')

# Paper grain over everything.
a(f'<rect width="{W}" height="{H}" filter="url(#mottle)" style="mix-blend-mode:multiply"/>')
a(f'<rect width="{W}" height="{H}" filter="url(#grain)" style="mix-blend-mode:multiply"/>')
a(f'<rect width="{W}" height="{H}" filter="url(#fleck)" opacity="0.35"/>')
a('</svg>')

svg = '\n'.join(out)
open('cover.svg', 'w').write(svg)
open('cover.html', 'w').write('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:#F3EEE4}svg{display:block}</style></head><body>' + svg + '</body></html>')
