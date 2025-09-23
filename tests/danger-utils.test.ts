import { extractAttrValueFromLine } from '../src/danger-utils';

describe('extractAttrValueFromLine', () => {
  const attr = 'data-testid';

  test('returns present=false when attribute not in line', () => {
    expect(extractAttrValueFromLine(attr, '<div />')).toEqual({ present: false, value: null });
  });

  test('parses quoted string', () => {
    expect(extractAttrValueFromLine(attr, '<div data-testid="foo" />')).toEqual({ present: true, value: 'foo' });
  });

  test('parses braces with quoted string', () => {
    expect(extractAttrValueFromLine(attr, '<div data-testid={"bar"} />')).toEqual({ present: true, value: 'bar' });
  });

  test('parses braces with template literal (captures raw contents)', () => {
    expect(extractAttrValueFromLine(attr, '<div data-testid={`baz-${1}`} />')).toEqual({ present: true, value: 'baz-${1}' });
  });

  test('handles non-literal expression', () => {
    const res = extractAttrValueFromLine(attr, '<div data-testid={someVar} />');
    expect(res.present).toBe(true);
    expect(res.value).toBe('(non-literal expression)');
  });
});
