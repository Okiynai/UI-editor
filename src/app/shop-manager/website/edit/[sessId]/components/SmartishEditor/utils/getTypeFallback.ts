export const getFieldTypeFallback = (field: any): any => {
  switch (field.type) {
    case 'number':
    case 'dimensions':
    case 'position':
    case 'spacing':
      return 0;
    case 'text':
    case 'textarea':
    case 'font':
      return '';
    case 'color':
    case 'gradient':
      return '#00000000';
    case 'checkbox':
      return false;
    case 'select':
      return '';
    case 'image':
    case 'file':
      return '';
    case 'icon':
      return '';
    case 'special':
      return '';
    case 'filter':
      return 'none';
    case 'flex':
      return 'row';
    case 'grid':
      return '1fr';
    case 'constraints':
      return 'auto';
    default:
      return undefined;
  }
}