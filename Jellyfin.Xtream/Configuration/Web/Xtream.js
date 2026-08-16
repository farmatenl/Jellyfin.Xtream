const url = (name) =>
  ApiClient.getUrl("configurationpage", {
    name,
  });
const tab = (name) => '/configurationpage?name=' + name + '.html';

$(document).ready(() => {
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = url('Xtream.css')
  document.head.appendChild(style);
});

const htmlExpand = document.createElement('span');
htmlExpand.ariaHidden = true;
htmlExpand.classList.add('material-icons', 'expand_more');

const createItemRow = (item, state, update) => {
  const tr = document.createElement('tr');
  tr.dataset['itemId'] = item.Id;

  let td = document.createElement('td');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = state;
  checkbox.onchange = update;
  td.appendChild(checkbox);
  tr.appendChild(td);

  td = document.createElement('td');
  const label = document.createElement('label');
  label.innerText = item.Name;
  td.appendChild(label);
  tr.appendChild(td);

  td = document.createElement('td');
  if (item.HasCatchup) {
    td.title = `Catch-up supported for ${item.CatchupDuration} days.`;

    let span = document.createElement('span');
    span.innerText = item.CatchupDuration;
    td.appendChild(span);

    span = document.createElement('span');
    span.ariaHidden = true;
    span.classList.add('material-icons', 'timer');
    td.appendChild(span);
  }
  tr.appendChild(td);

  return tr;
}

const populateItemsTable = (wrapper, table, items) => {
  for (let i = 0; i < items.length; ++i) {
    const item = items[i];
    const state = wrapper.live !== undefined && (wrapper.live.length === 0 || wrapper.live.includes(item.Id));
    const row = createItemRow(item, state, (e) => {
      let live = wrapper.live;
      if (e.target.checked) {
        live ??= [];
        live.push(item.Id);
        if (items.every(s => live.includes(s.Id))) {
          live = [];
        }
      } else {
        if (live.length === 0) {
          live = items.map(s => s.Id);
        }
        live = live.filter(id => id != item.Id);
        if (live.length === 0) {
          live = undefined;
        }
      }
      wrapper.live = live;
    });
    table.appendChild(row);
  }
}

const setCheckboxState = (checkbox, live) => {
  checkbox.indeterminate = live !== undefined && live.length > 0;
  checkbox.checked = live !== undefined && live.length === 0;
}

const createCategoryRow = (wrapper, category, loadItems) => {
  const tr = document.createElement('tr');
  tr.dataset['categoryId'] = category.Id;

  let td = document.createElement('td');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  setCheckboxState(checkbox, wrapper.live);
  const onchange = () => {
    if (checkbox.checked) {
      wrapper.live = [];
    } else {
      wrapper.live = undefined;
    }
  };
  checkbox.onchange = onchange;
  td.appendChild(checkbox);
  tr.appendChild(td);

  const _wrapper = {
    get live() { return wrapper.live; },
    set live(value) {
      wrapper.live = value;
      setCheckboxState(checkbox, wrapper.live);
    },
  }

  td = document.createElement('td');
  td.innerHTML = category.Name;
  tr.appendChild(td);

  td = document.createElement('td');
  const expand = document.createElement('button');
  expand.type = 'button';
  expand.classList.add('paper-icon-button-light');
  expand.appendChild(htmlExpand.cloneNode(true));
  expand.onclick = (e) => {
    e.preventDefault();
    const originalClick = expand.onclick;

    Dashboard.showLoadingMsg();
    expand.firstElementChild.classList.replace('expand_more', 'expand_less');
    const table = document.createElement('table');
    loadItems(category.Id).then((items) => {
      populateItemsTable(_wrapper, table, items);
      Dashboard.hideLoadingMsg();
    });
    checkbox.onchange = () => {
      onchange();
      table.querySelectorAll('input[type="checkbox"]').forEach((c) => c.checked = checkbox.checked);
    };
    td.appendChild(table);

    expand.onclick = () => {
      expand.onclick = originalClick;

      Dashboard.showLoadingMsg();
      expand.firstElementChild.classList.replace('expand_less', 'expand_more');
      td.removeChild(table);
      Dashboard.hideLoadingMsg();
    };
  };
  td.appendChild(expand);
  tr.appendChild(td);

  return tr;
};

const populateCategoriesTable = (table, loadConfig, loadCategories, loadItems) => {
  Dashboard.showLoadingMsg();
  const fetchConfig = loadConfig();
  const fetchCategories = loadCategories();

  return Promise.all([fetchConfig, fetchCategories])
    .then(([config, categories]) => {
      const data = config;
      for (let i = 0; i < categories.length; ++i) {
        const category = categories[i];
        const wrapper = {
          get live() { return data[category.Id]; },
          set live(value) {
            data[category.Id] = value;
          },
        }
        const elem = createCategoryRow(wrapper, category, loadItems);
        table.appendChild(elem);
      }
      Dashboard.hideLoadingMsg();
      return data;
    });
}

// Keep in sync with categoryToolbar.js (node tests). Relative imports 404
// because Jellyfin serves each plugin page by name, not as a directory.
const categoryMatches = (name, query) => {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return true;
  return String(name ?? '').toLowerCase().includes(q);
};

const isFullySelected = (live) => Array.isArray(live) && live.length === 0;

const nextBulkAction = (lives) => {
  if (lives.length > 0 && lives.every(isFullySelected)) return 'deselect';
  return 'select';
};

const visibleCategoryRows = (table) =>
  [...table.querySelectorAll('tr[data-category-id]')]
    .filter((row) => row.style.display !== 'none');

const categoryLive = (data, id) => {
  if (Object.prototype.hasOwnProperty.call(data, id)) return data[id];
  const numericId = Number(id);
  if (!Number.isNaN(numericId) && Object.prototype.hasOwnProperty.call(data, numericId)) {
    return data[numericId];
  }
  return undefined;
};

const applyFilter = (filterInput, table) => {
  if (!filterInput || !table) return;
  const query = filterInput.value;
  table.querySelectorAll('tr[data-category-id]').forEach((row) => {
    const nameCell = row.querySelector('td:nth-child(2)');
    const name = nameCell ? nameCell.innerText : '';
    row.style.display = categoryMatches(name, query) ? '' : 'none';
  });
};

const applyBulk = (table, data, action) => {
  visibleCategoryRows(table).forEach((row) => {
    const checkbox = row.querySelector('td:first-child > input[type="checkbox"]');
    if (!checkbox) return;
    checkbox.checked = action === 'select';
    checkbox.indeterminate = false;
    checkbox.dispatchEvent(new Event('change'));
  });
};

const refreshBulkButton = (button, table, data) => {
  if (!button || !table) return;
  const lives = visibleCategoryRows(table).map((row) => categoryLive(data, row.dataset.categoryId));
  const action = nextBulkAction(lives);
  button.dataset.action = action;
  const label = button.querySelector('span');
  if (label) {
    label.innerText = action === 'deselect' ? 'Deselect all' : 'Select all';
  }
};

const bindSelectionToolbar = (view, table, data) => {
  const filterInput = view.querySelector('#CategoryFilter');
  const bulk = view.querySelector('#BulkSelect');
  const sync = () => refreshBulkButton(bulk, table, data);
  if (filterInput) {
    filterInput.addEventListener('input', () => {
      applyFilter(filterInput, table);
      sync();
    });
  }
  if (bulk) {
    bulk.addEventListener('click', () => {
      applyBulk(table, data, bulk.dataset.action || 'select');
      sync();
    });
  }
  sync();
};

const fetchJson = (url) => ApiClient.fetch({
  dataType: 'json',
  type: 'GET',
  url: ApiClient.getUrl(url),
});

const filter = (obj, predicate) => Object.keys(obj)
  .filter(key => predicate(obj[key]))
  .reduce((res, key) => (res[key] = obj[key], res), {});

const tabs = [
  {
    href: tab('XtreamCredentials'),
    name: 'Credentials'
  },
  {
    href: tab('XtreamLive'),
    name: 'Live TV'
  },
  {
    href: tab('XtreamLiveOverrides'),
    name: 'TV overrides'
  },
  {
    href: tab('XtreamVod'),
    name: 'Video On-Demand',
  },
  {
    href: tab('XtreamSeries'),
    name: 'Series',
  },
];

const setTabs = (index) => {
  const name = tabs[index].name;
  LibraryMenu.setTabs(name, index, () => tabs);
}

const pluginConfig = {
  UniqueId: '5d774c35-8567-46d3-a950-9bb8227a0c5d'
};

export default {
  fetchJson,
  filter,
  pluginConfig,
  populateCategoriesTable,
  applyFilter,
  applyBulk,
  refreshBulkButton,
  bindSelectionToolbar,
  setTabs,
}
