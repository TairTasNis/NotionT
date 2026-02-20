import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import BarChartComponent from './BarChartComponent';

export default Node.create({
  name: 'barChart',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      data: {
        default: [
          { name: 'A', value: 10 },
          { name: 'B', value: 20 },
          { name: 'C', value: 15 },
        ],
        parseHTML: element => {
            const data = element.getAttribute('data-chart-data');
            return data ? JSON.parse(data) : [];
        },
        renderHTML: attributes => {
            return {
                'data-chart-data': JSON.stringify(attributes.data),
            }
        }
      },
      title: {
        default: 'Bar Chart',
      },
      color: {
        default: '#8884d8',
      },
      type: {
        default: 'simple', // 'simple' | 'stacked'
      },
      width: {
        default: '100%',
      },
      height: {
        default: '300px',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bar-chart"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'bar-chart' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BarChartComponent);
  },
});
