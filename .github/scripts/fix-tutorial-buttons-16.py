from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
path = root / 'src/components/Tutorial.tsx'
source = path.read_text(encoding='utf-8')
links = [
    ('Telegram', 'https://t.me/Audio_ToolZ'),
    ('Github', 'https://github.com/x-R0b0T-x/Audio-ToolZ'),
    ('Paypal', 'https://www.paypal.com/ncp/payment/GAUJE54VM28T8'),
]
for label, url in links:
    pattern = r'\{label:"[^"]*",href:"' + re.escape(url) + r'"\}'
    source, count = re.subn(pattern, lambda _: '{label:"' + label + '",href:"' + url + '"}', source)
    if count != 1:
        raise RuntimeError('Expected exactly one tutorial link: ' + url)
sentence = ' Vous pouvez aussi soutenir le projet par un don via PayPal.'
while sentence + sentence in source:
    source = source.replace(sentence + sentence, sentence)
path.write_text(source, encoding='utf-8')
css_path = root / 'src/components/tutorial.css'
css = css_path.read_text(encoding='utf-8')
marker = '/* v1.6 compact equal community buttons */'
css = css.split(marker)[0].rstrip() + '\n'
css += '''/* v1.6 compact equal community buttons */
.atz-tuto .atz-tuto-links{display:flex;flex-wrap:wrap;gap:8px;padding:4px}
.atz-tuto .atz-tuto-links>a.atz-tuto-link{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;flex:0 0 100px;width:100px;min-width:100px;max-width:100px;height:32px;min-height:32px;max-height:32px;padding:0 8px;white-space:nowrap;font-size:13px;color:#fff!important;background:#7928b5;border:1px solid #b34dff;border-radius:7px;box-shadow:0 0 5px #b34dff66;transition:background-color .16s ease,border-color .16s ease,box-shadow .16s ease}
.atz-tuto .atz-tuto-links>a.atz-tuto-link:hover,.atz-tuto .atz-tuto-links>a.atz-tuto-link:focus-visible{background:#166b21;border-color:#39ff14;color:#fff!important;outline:2px solid #39ff14;outline-offset:2px;box-shadow:0 0 8px #39ff1488}
@media(prefers-reduced-motion:reduce){.atz-tuto .atz-tuto-links>a.atz-tuto-link{transition:none}}
'''
css_path.write_text(css, encoding='utf-8')
matches = re.findall(r'\{label:"([^"]*)",href:"([^"]*)"\}', source)
assert matches == links, matches
assert sentence + sentence not in source
for token in ['width:100px', 'height:32px', 'background:#7928b5', 'background:#166b21']:
    assert token in css
print('Verified tutorial labels, destinations and equal button dimensions.')
