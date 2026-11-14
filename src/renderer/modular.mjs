import { columns, rows, maxModules, maxPresets, moduleCatalog, moduleSize, starterPresets, fits, findSpace, sanitizeLayout, sanitizePresets, sanitizeModularAppearance, tileVisualizerEnabled } from './modular-layout.mjs';
import { mountModule } from './modular-tiles.mjs';

export const modularMarkup = () => `<section id="modular-deck" class="modular-deck" hidden>
  <header class="um-header">
    <div class="um-wordmark">Ultra <b>Modular</b><small data-um-status></small></div>
    <div class="um-actions">
      <label data-um-preset-picker>Preset <select data-um-presets aria-label="Load a layout preset"></select></label>
      <button type="button" data-um-background aria-haspopup="dialog"><i aria-hidden="true"></i> Background</button>
      <button type="button" data-um-source hidden></button>
      <button type="button" data-um-edit>Edit layout</button>
    </div>
  </header>
  <div class="um-editor" data-um-editor hidden>
    <div class="um-editor-controls">
      <div class="um-tools">
        <button type="button" data-um-library aria-haspopup="dialog">Add a module ▾</button>
      </div>
      <div class="um-tools">
        <label>Preset name <input data-um-name maxlength="36" placeholder="Name this layout"></label>
        <button type="button" data-um-save>Save preset</button>
        <button type="button" data-um-delete hidden>Delete preset</button>
      </div>
      <div class="um-tools">
        <button type="button" data-um-cancel>Cancel</button>
        <button type="button" data-um-done>Done</button>
      </div>
    </div>
    <div class="um-editor-footer">
      <span data-um-message role="status">Drag a module to move it. Drag its corner to resize.</span>
      <div class="um-nudge" data-um-nudge hidden>
        <span data-um-selected></span>
        <button type="button" data-move="-1,0" aria-label="Move left">←</button>
        <button type="button" data-move="0,-1" aria-label="Move up">↑</button>
        <button type="button" data-move="0,1" aria-label="Move down">↓</button>
        <button type="button" data-move="1,0" aria-label="Move right">→</button>
        <button type="button" data-size="-1,0" aria-label="Decrease width">W−</button>
        <button type="button" data-size="1,0" aria-label="Increase width">W+</button>
        <button type="button" data-size="0,-1" aria-label="Decrease height">H−</button>
        <button type="button" data-size="0,1" aria-label="Increase height">H+</button>
        <button type="button" data-um-remove>Remove</button>
      </div>
    </div>
  </div>
  <dialog class="deck-library um-library" data-um-picker aria-label="Module library">
    <header>
      <div><button type="button" data-um-back hidden>← All decks</button><h2 data-um-folder-title>Module library</h2></div>
      <button type="button" data-um-close aria-label="Close module library">×</button>
    </header>
    <p data-um-library-note>Choose a deck to browse its modules.</p>
    <div class="deck-grid" data-um-cards></div>
    <p data-um-picker-message role="status" hidden></p>
  </dialog>
  <dialog class="deck-library um-appearance-dialog" data-um-appearance aria-label="Ultra Modular background">
    <form data-um-appearance-form>
      <h2>Background</h2>
      <label>Background color <input type="color" data-um-color value="#101820"></label>
      <label><input type="checkbox" data-um-sync> Sync background to album art</label>
      <label><input type="checkbox" data-um-distinction> Tile distinction</label>
      <p data-um-appearance-error role="status" hidden>Could not save the background settings. Try again.</p>
      <div class="um-appearance-actions"><button type="button" data-um-appearance-cancel>Cancel</button><button type="submit">Apply</button></div>
    </form>
  </dialog>
  <div class="um-viewport"><div class="um-grid" data-um-grid></div></div>
  <div class="um-empty" data-um-empty hidden>Add modules to build your dashboard.</div>
</section>`;

const folders = [
  ['Ultra Glass', 'ultra'], ['Ultra Atlas', 'atlas'], ['Ultra Sound', 'sound'],
  ['Ultra Levels', 'levels'], ['Ultra Lyrics', 'lyrics'], ['Martin', 'martin'],
  ['M235', 'm235'], ['Civetta', 'civetta'], ['Model S', 'model-s'],
  ['Model Three', 'model-three'], ['Plaid Track', 'plaid-track'],
  ['Luce', 'homosexual'], ['iadnuyh', 'iadnuyh'], ['DriveDeck', 'modular'],
].map(([name, image]) => ({
  name, image, modules: Object.entries(moduleCatalog).filter(([, [, deck]]) =>
    (deck.startsWith('Plaid ') ? 'Plaid Track' : deck) === name),
}));

const guidance = 'Drag a module to move it. Drag its corner to resize.';
const layoutKey = layout => JSON.stringify(layout);
const sameLayout = (a, b) => a.length === b.length && a.every((tile, index) => {
  const other = b[index];
  return tile.type === other.type && tileVisualizerEnabled(tile) === tileVisualizerEnabled(other) && tile.x === other.x && tile.y === other.y && tile.w === other.w && tile.h === other.h;
});

export class ModularDeck {
  constructor(root, source, actions) {
    this.root = root;
    this.source = source;
    this.actions = actions;
    this.grid = this.control('grid');
    this.editor = this.control('editor');
    this.presetSelect = this.control('presets');
    this.mounted = new Map();
    this.selected = null;
    this.sequence = 0;
    this.presets = [];
    this.layout = sanitizeLayout();
    this.library = this.control('library');
    this.picker = this.control('picker');
    this.library.onclick = () => {
      this.showFolder();
      this.picker.showModal();
    };
    this.control('close').onclick = () => this.picker.close();
    this.control('back').onclick = () => this.showFolder(null, true);
    this.picker.onclick = event => {
      if (event.target === this.picker) this.picker.close();
    };
    this.control('cards').onclick = event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.folder !== undefined) this.showFolder(folders[Number(button.dataset.folder)]);
      else if (this.add(button.dataset.moduleChoice)) this.picker.close();
    };
    this.appearanceDialog = this.control('appearance');
    this.appearance = sanitizeModularAppearance();
    this.control('background').onclick = () => this.openAppearance();
    this.control('appearance-cancel').onclick = () => this.appearanceDialog.close();
    this.control('appearance-form').oninput = () => this.previewAppearance();
    this.control('appearance-form').onsubmit = event => { event.preventDefault(); void this.saveAppearance(); };
    this.appearanceDialog.onclose = () => this.applyAppearance(this.appearance);
    this.appearanceDialog.onclick = event => {
      if (event.target === this.appearanceDialog) this.appearanceDialog.close();
    };
    this.control('source').hidden = !actions.modularSwitchSource;
    this.control('source').onclick = () => actions.modularSwitchSource?.();
    this.control('edit').onclick = () => this.begin();
    this.control('cancel').onclick = () => this.cancel();
    this.control('done').onclick = () => this.finish();
    this.control('save').onclick = () => this.savePreset();
    this.control('delete').onclick = () => this.deletePreset();
    this.control('remove').onclick = () => this.remove();
    this.control('name').onkeydown = event => {
      if (event.key === 'Enter') { event.preventDefault(); this.savePreset(); }
    };
    this.control('name').oninput = () => { this.confirmReplace = null; };
    this.presetSelect.onchange = () => this.loadPreset();
    this.control('nudge').onclick = event => {
      const button = event.target.closest('[data-move],[data-size]');
      if (button) this.nudge(button.dataset.move || button.dataset.size, Boolean(button.dataset.size));
    };
    this.grid.addEventListener('pointerdown', event => this.startDrag(event));
    this.grid.addEventListener('pointermove', event => this.moveDrag(event));
    this.grid.addEventListener('pointerup', event => this.endDrag(event));
    this.grid.addEventListener('pointercancel', event => this.endDrag(event, true));
    this.grid.addEventListener('lostpointercapture', event => this.endDrag(event, true));
    this.root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.draft) {
        event.stopPropagation();
        if (!this.picker.open && !this.appearanceDialog.open) this.cancel();
      }
    });
  }

  control(name) { return this.root.querySelector(`[data-um-${name}]`); }
  message(text) { this.control('message').textContent = text; }

  setVisible(visible) {
    if (this.root.hidden === !visible) return;
    this.root.hidden = !visible;
    if (!visible) {
      if (this.appearanceDialog.open) this.appearanceDialog.close();
      if (this.draft) this.cancel(false);
      for (const item of this.mounted.values()) item.hide();
    }
  }

  hasTile(...types) {
    return (this.draft?.layout ?? this.layout).some(tile => types.includes(tile.type));
  }

  update(state, palette) {
    const readOnly = state.settings.modularReadOnly === true;
    if (readOnly !== this.readOnly) {
      this.readOnly = readOnly;
      this.root.classList.toggle('um-read-only', readOnly);
      this.control('preset-picker').hidden = readOnly;
      this.control('background').hidden = readOnly;
      this.control('edit').hidden = readOnly || Boolean(this.draft);
      this.control('source').textContent = readOnly ? 'Stay on mobile' : 'Use desktop layout';
    }
    const appearance = state.settings.modularAppearance;
    if (appearance !== this.appearanceInput) {
      this.appearanceInput = appearance;
      const next = sanitizeModularAppearance(appearance);
      if (layoutKey(next) !== layoutKey(this.appearance)) {
        this.appearance = next;
        if (!this.appearanceDialog.open) this.applyAppearance(next);
      }
    }
    if (!this.draft && !this.saving) {
      const input = state.settings.modularLayout;
      const presets = state.settings.modularPresets;
      if (!this.initialized || input !== this.layoutInput || presets !== this.presetInput) {
        this.initialized = true;
        this.layoutInput = input;
        this.presetInput = presets;
        const nextLayout = sanitizeLayout(input);
        const nextPresets = sanitizePresets(presets);
        if (layoutKey(nextLayout) !== layoutKey(this.layout) || layoutKey(nextPresets) !== layoutKey(this.presets) || !this.rendered) {
          this.layout = nextLayout;
          this.presets = nextPresets;
          this.render();
        }
      }
    }
    const label = state.settings.demo ? 'Demo drive' : state.data.connected ? state.data.vehicleName || 'BeamNG connected' : 'Waiting for BeamNG';
    if (this.control('status').textContent !== label) this.control('status').textContent = label;
    for (const item of this.mounted.values()) item.update(state, palette);
  }

  applyAppearance({ color, syncArtwork, tileDistinction }) {
    this.root.style.setProperty('--um-background-color', color ?? '');
    this.root.dataset.syncArtwork = String(syncArtwork);
    this.root.classList.toggle('um-seamless', !tileDistinction);
    const [r, g, b] = (color ?? '#101820').slice(1).match(/../g).map(value => parseInt(value, 16));
    this.root.classList.toggle('um-light-background', r * .213 + g * .715 + b * .072 > 160);
  }

  openAppearance() {
    this.control('color').value = this.appearance.color ?? '#101820';
    this.control('sync').checked = this.appearance.syncArtwork;
    this.control('distinction').checked = this.appearance.tileDistinction;
    this.control('appearance-error').hidden = true;
    this.appearanceDialog.showModal();
  }

  readAppearance() {
    const color = this.control('color').value;
    return {
      color: this.appearance.color === null && color === '#101820' ? null : color,
      syncArtwork: this.control('sync').checked,
      tileDistinction: this.control('distinction').checked,
    };
  }

  previewAppearance() {
    this.applyAppearance(this.readAppearance());
  }

  async saveAppearance() {
    const form = this.control('appearance-form');
    const modularAppearance = this.readAppearance();
    form.inert = true;
    try {
      if (await this.actions.modularSave?.({ modularAppearance })) {
        this.appearance = modularAppearance;
        this.applyAppearance(modularAppearance);
        this.appearanceDialog.close();
        return;
      }
    } catch {
      // Keep the preview open so the user can retry.
    } finally {
      form.inert = false;
    }
    this.control('appearance-error').hidden = false;
  }

  showFolder(folder, restoreFocus = false) {
    const cards = this.control('cards');
    const previous = this.folder;
    this.folder = folder;
    this.control('folder-title').textContent = folder?.name ?? 'Module library';
    this.control('library-note').textContent = folder ? 'Choose a module to add it to your layout.' : 'Choose a deck to browse its modules.';
    this.control('back').hidden = !folder;
    this.control('picker-message').hidden = true;
    cards.classList.toggle('um-module-choices', Boolean(folder));
    cards.innerHTML = folder
      ? folder.modules.map(([type, [label]]) =>
        `<button class="deck-choice" type="button" data-module-choice="${type}"><div><strong>${label}</strong></div></button>`).join('')
      : folders.map(({ name, image, modules }, index) =>
        `<button class="deck-choice" type="button" data-folder="${index}"><img src="${new URL(`./assets/decks/${image}.png`, import.meta.url).href}" alt="" decoding="async"><div><strong>${name}</strong><small>${modules.length} ${modules.length === 1 ? 'module' : 'modules'}</small></div></button>`).join('');
    if (folder) cards.querySelector('button')?.focus();
    else if (restoreFocus) cards.children[folders.indexOf(previous)]?.focus();
  }

  begin() {
    this.draft = { layout: this.layout.map(tile => ({ ...tile })), presets: [...this.presets] };
    this.selected = null;
    this.confirmReplace = null;
    this.control('name').value = '';
    this.message(guidance);
    this.render();
    this.library.focus();
  }

  cancel(focus = true) {
    if (this.saving) return;
    if (this.picker.open) this.picker.close();
    this.stopDrag();
    this.draft = null;
    this.selected = null;
    this.render();
    if (focus) this.control('edit').focus();
  }

  async persist(layout, presets) {
    if (this.saving) return false;
    this.saving = true;
    try {
      if (!await this.actions.modularSave?.({ modularLayout: layout, modularPresets: presets })) return false;
      this.layout = layout;
      this.presets = presets;
      return true;
    } catch {
      return false;
    } finally {
      this.saving = false;
    }
  }

  async setTileVisualizer(id, enabled) {
    if (this.readOnly || this.draft || this.saving) return;
    const layout = this.layout.map(tile => {
      if (tile.id !== id) return tile;
      const next = { ...tile };
      next.visualizer = enabled;
      return next;
    });
    if (await this.persist(layout, this.presets)) this.render();
  }

  async finish() {
    if (!this.draft || this.saving) return;
    this.stopDrag();
    const { layout, presets } = this.draft;
    this.editor.inert = true;
    const saved = await this.persist(layout, presets);
    this.editor.inert = false;
    if (saved) this.cancel();
    else this.message('Could not save the layout. Try again.');
  }

  get choices() {
    return [...starterPresets, ...(this.draft?.presets ?? this.presets)];
  }

  renderPresets() {
    const layout = this.draft?.layout ?? this.layout;
    const chosen = this.choices.findIndex(preset => sameLayout(preset.layout, layout) && preset.name === this.chosen);
    const fallback = this.choices.findIndex(preset => sameLayout(preset.layout, layout));
    const index = chosen >= 0 ? chosen : fallback;
    this.presetSelect.replaceChildren(new Option('Custom layout', ''), ...this.choices.map((preset, i) => new Option(
      i < starterPresets.length ? preset.name + ' · Starter' : preset.name, String(i))));
    this.presetSelect.value = index < 0 ? '' : String(index);
    this.control('delete').hidden = !this.draft || index < starterPresets.length;
    this.control('delete').dataset.index = String(index - starterPresets.length);
  }

  async loadPreset() {
    if (this.presetSelect.value === '' || this.saving) return;
    const preset = this.choices[Number(this.presetSelect.value)];
    if (!preset) return;
    const layout = preset.layout.map(tile => ({ ...tile }));
    const previous = this.chosen;
    this.chosen = preset.name;
    this.selected = null;
    if (this.draft) {
      this.draft.layout = layout;
      this.control('name').value = '';
      this.message(guidance);
    } else {
      this.presetSelect.disabled = true;
      if (!await this.persist(layout, this.presets)) this.chosen = previous;
      this.presetSelect.disabled = false;
    }
    this.render();
  }

  savePreset() {
    if (!this.draft || this.saving) return;
    const name = this.control('name').value.trim();
    if (!name) { this.message('Enter a name for the preset.'); this.control('name').focus(); return; }
    const previous = this.draft.presets.findIndex(preset => preset.name.toLowerCase() === name.toLowerCase());
    if (previous < 0 && this.draft.presets.length >= maxPresets) { this.message('Remove a saved preset before adding another.'); return; }
    const preset = { name, layout: this.draft.layout.map(tile => ({ ...tile })) };
    if (previous < 0) this.draft.presets.push(preset);
    else {
      if (this.confirmReplace !== name) {
        this.confirmReplace = name;
        this.message(`“${name}” already exists. Select Save preset again to replace it.`);
        return;
      }
      this.draft.presets[previous] = preset;
    }
    this.confirmReplace = null;
    this.chosen = name;
    this.message(`Preset “${name}” is ready. Select Done to keep it.`);
    this.renderPresets();
  }

  deletePreset() {
    if (!this.draft || this.saving) return;
    const index = Number(this.control('delete').dataset.index);
    if (index < 0 || !this.draft.presets[index]) return;
    const [preset] = this.draft.presets.splice(index, 1);
    this.chosen = null;
    this.message(`“${preset.name}” removed. Select Done to keep the change.`);
    this.renderPresets();
  }

  add(type) {
    if (!this.draft || !Object.hasOwn(moduleCatalog, type)) return false;
    const { layout } = this.draft;
    const showError = message => {
      const status = this.control('picker-message');
      status.textContent = message;
      status.hidden = false;
      return false;
    };
    if (layout.length >= maxModules) return showError('This layout has reached its module limit.');
    const [, , w, h] = moduleCatalog[type];
    let id;
    do { id = 'module-' + ++this.sequence; } while (layout.some(tile => tile.id === id));
    const [minW, minH] = moduleSize(type);
    const tile = findSpace(layout, { id, type, w, h }) || findSpace(layout, { id, type, w: minW, h: minH });
    if (!tile) return showError('No free space. Move, shrink, or remove a module first.');
    this.draft.layout = [...layout, tile];
    this.selected = id;
    this.message(guidance);
    this.render();
    return true;
  }

  remove() {
    this.draft.layout = this.draft.layout.filter(tile => tile.id !== this.selected);
    this.selected = null;
    this.message(guidance);
    this.render();
  }

  nudge(value, resize) {
    const tile = this.draft.layout.find(item => item.id === this.selected);
    if (!tile) return;
    const [dx, dy] = value.split(',').map(Number);
    const candidate = resize ? { ...tile, w: tile.w + dx, h: tile.h + dy } : { ...tile, x: tile.x + dx, y: tile.y + dy };
    if (!this.place(tile, candidate, resize)) return this.message('That space is occupied or outside the grid.');
    this.message(guidance);
    this.render();
  }

  place(tile, candidate, resize) {
    const layout = this.draft.layout;
    const [minW, minH] = moduleSize(tile.type);
    if (candidate.w < minW || candidate.h < minH) return false;
    if (fits(layout, candidate)) {
      this.draft.layout = layout.map(other => other.id === tile.id ? candidate : other);
      return true;
    }
    const target = !resize && layout.find(other => other.id !== tile.id && other.x === candidate.x && other.y === candidate.y);
    if (!target) return false;
    const moved = { ...target, x: tile.x, y: tile.y };
    const rest = layout.filter(other => other.id !== tile.id && other.id !== target.id);
    if (!fits(rest, candidate) || !fits([...rest, candidate], moved)) return false;
    this.draft.layout = layout.map(other => other.id === tile.id ? candidate : other.id === target.id ? moved : other);
    return true;
  }

  startDrag(event) {
    const handle = event.target.closest('[data-um-handle], [data-um-resize]');
    if (!this.draft || !handle || event.button !== 0 || this.drag) return;
    const tile = this.draft.layout.find(item => item.id === handle.closest('.um-tile').dataset.id);
    if (!tile) return;
    handle.focus({ preventScroll: true });
    this.selected = tile.id;
    this.renderSelection();
    const box = this.grid.getBoundingClientRect();
    const mounted = this.mounted.get(tile.id);
    this.drag = { pointer: event.pointerId, tile, mounted, resize: handle.hasAttribute('data-um-resize'),
      startX: event.clientX, startY: event.clientY, cellW: box.width / columns, cellH: box.height / rows };
    mounted.element.classList.add('dragging');
    this.grid.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  moveDrag(event) {
    if (this.drag?.pointer !== event.pointerId) return;
    const { tile, mounted, resize, startX, startY, cellW, cellH } = this.drag;
    const dx = Math.round((event.clientX - startX) / cellW);
    const dy = Math.round((event.clientY - startY) / cellH);
    const [minW, minH] = moduleSize(tile.type);
    this.drag.candidate = resize
      ? { ...tile, w: Math.min(columns - tile.x, Math.max(minW, tile.w + dx)), h: Math.min(rows - tile.y, Math.max(minH, tile.h + dy)) }
      : { ...tile, x: Math.min(columns - tile.w, Math.max(0, tile.x + dx)), y: Math.min(rows - tile.h, Math.max(0, tile.y + dy)) };
    this.position(mounted.element, this.drag.candidate);
  }

  stopDrag() {
    if (!this.drag) return;
    const { pointer, mounted } = this.drag;
    this.drag = null;
    mounted.element.classList.remove('dragging');
    if (this.grid.hasPointerCapture(pointer)) this.grid.releasePointerCapture(pointer);
  }

  endDrag(event, canceled = false) {
    if (this.drag?.pointer !== event.pointerId) return;
    const { tile, candidate, resize } = this.drag;
    this.stopDrag();
    if (!canceled && candidate && !this.place(tile, candidate, resize)) this.message('That space is occupied.');
    else this.message(guidance);
    this.render();
  }

  position(node, { x, y, w, h }) {
    node.classList.toggle('um-one-column', w === 1);
    node.classList.toggle('um-one-row', h === 1);
    node.style.gridColumn = `${x + 1} / span ${w}`;
    node.style.gridRow = `${y + 1} / span ${h}`;
  }

  renderSelection() {
    const selected = this.draft?.layout.find(tile => tile.id === this.selected);
    this.control('nudge').hidden = !selected;
    this.control('selected').textContent = selected ? moduleCatalog[selected.type][0] : '';
    for (const [id, item] of this.mounted) item.element.classList.toggle('selected', id === this.selected);
  }

  render() {
    this.rendered = true;
    const layout = this.draft?.layout ?? this.layout;
    this.root.classList.toggle('editing', Boolean(this.draft));
    this.editor.hidden = !this.draft;
    this.control('edit').hidden = this.readOnly || Boolean(this.draft);
    this.control('empty').hidden = layout.length > 0;
    for (const [id, mounted] of this.mounted) {
      if (layout.some(tile => tile.id === id && tile.type === mounted.type)) continue;
      mounted.hide();
      mounted.element.remove();
      this.mounted.delete(id);
    }
    const ordered = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
    ordered.forEach((tile, index) => {
      let mounted = this.mounted.get(tile.id);
      if (!mounted) {
        const element = document.createElement('article');
        element.className = 'um-tile';
        element.dataset.id = tile.id;
        element.dataset.module = tile.type;
        const [label, deck] = moduleCatalog[tile.type];
        element.setAttribute('aria-label', label);
        element.innerHTML = `<button type="button" class="um-tile-title" data-um-handle title="${label}" aria-label="Select ${label}"><span>${label}</span><small>${deck}</small></button>
          <div class="um-tile-content"></div><button type="button" class="um-grip" data-um-resize aria-label="Resize ${label}">◢</button>`;
        element.firstElementChild.onclick = () => {
          if (!this.draft) return;
          this.selected = tile.id;
          this.renderSelection();
        };
        const local = mountModule(element.querySelector('.um-tile-content'), tile, this.source, this.actions, `um-${tile.id}-`,
          enabled => this.setTileVisualizer(tile.id, enabled));
        mounted = { ...local, element, type: tile.type };
        this.mounted.set(tile.id, mounted);
      }
      mounted.configure?.(tile);
      this.position(mounted.element, tile);
      mounted.element.firstElementChild.disabled = !this.draft;
      mounted.element.lastElementChild.hidden = !this.draft;
      if (this.grid.children[index] !== mounted.element) this.grid.insertBefore(mounted.element, this.grid.children[index] || null);
    });
    this.renderPresets();
    this.renderSelection();
  }
}
