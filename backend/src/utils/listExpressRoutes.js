/**
 * Collect registered HTTP routes from an Express app (method + full path).
 */
export function listExpressRoutes(app) {
  const routes = [];
  walkStack(app?._router?.stack, '', routes);
  return routes;
}

function walkStack(stack, prefix, routes) {
  if (!stack) return;
  for (const layer of stack) {
    if (layer.route) {
      const segment = layer.route.path === '/' ? '' : layer.route.path;
      const path = normalizePath(`${prefix}${segment}`);
      for (const [method, enabled] of Object.entries(layer.route.methods)) {
        if (enabled) routes.push({ method: method.toUpperCase(), path });
      }
      continue;
    }
    if (layer.name === 'router' && layer.handle?.stack) {
      const mount = routerMountPath(layer);
      walkStack(layer.handle.stack, normalizePath(`${prefix}${mount}`), routes);
    }
  }
}

function routerMountPath(layer) {
  if (typeof layer.path === 'string') return layer.path;
  const regexp = layer.regexp;
  if (!regexp) return '';
  if (regexp.fast_slash) return '';
  const source = regexp.source || '';
  const expressMount = source.match(/^\^\\\/(.+)\\\/\?\(\?=\\\/\|\$\)/);
  if (expressMount) {
    return `/${expressMount[1].replace(/\\\//g, '/')}`;
  }
  return '';
}

function normalizePath(path) {
  if (!path) return '/';
  const collapsed = path.replace(/\/+/g, '/');
  if (collapsed.length > 1 && collapsed.endsWith('/')) return collapsed.slice(0, -1);
  return collapsed;
}
