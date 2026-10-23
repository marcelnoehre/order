const timeBudget = {
  id: 'timeoutMs',
  label: 'Time budget',
  type: 'budget',
  default: 1000,
  min: 10,
  step: 100,
  hint: 'Unbounded searches until the layout is proven optimal, which can take very long.',
}

export const drawings = [
  {
    id: 'dimflux',
    name: 'DimFlux',
    parameters: [{ ...timeBudget, hint: 'Applies to the DimDraw layout DimFlux starts from.' }],
  },
  { id: 'dimdraw', name: 'DimDraw', parameters: [timeBudget] },
  {
    id: 'sugiyama',
    name: 'Sugiyama',
    parameters: [
      {
        id: 'ranking',
        label: 'Layering',
        type: 'select',
        default: 'minimize',
        options: [
          { value: 'minimize', label: 'Minimise edge length' },
          { value: 'up', label: 'Push concepts up' },
          { value: 'down', label: 'Push concepts down' },
          { value: 'original', label: 'Up, then down' },
        ],
      },
      {
        id: 'crossingMinimization',
        label: 'Crossing minimisation',
        type: 'select',
        default: 'barycenter',
        options: [
          { value: 'barycenter', label: 'Barycenter' },
          { value: 'median', label: 'Median' },
        ],
      },
      {
        id: 'transpose',
        label: 'Transpose',
        type: 'toggle',
        default: true,
        hint: 'Swaps neighbours to remove more crossings, slower on large lattices.',
      },
      {
        id: 'dummyVertices',
        label: 'Dummy vertices',
        type: 'toggle',
        default: true,
        hint: 'Routes long edges through intermediate layers while placing concepts.',
      },
    ],
  },
]
