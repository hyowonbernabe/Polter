import { render } from '@testing-library/react';
import { GhostSprite } from '@/components/ui/GhostSprite';

test('renders img with correct src and pixel-art class', () => {
  const { container } = render(<GhostSprite name="front.png" scale={2} />);
  const img = container.querySelector('img')!;
  expect(img).toHaveAttribute('src', '/sprites/front.png');
  expect(img).toHaveAttribute('width', '96');
  expect(img).toHaveClass('pixel-art');
});

test('applies scaleX(-1) when flip=true', () => {
  const { container } = render(<GhostSprite name="front.png" flip />);
  expect(container.querySelector('img')).toHaveStyle({ transform: 'scaleX(-1)' });
});

test('scale=4 gives 192px', () => {
  const { container } = render(<GhostSprite name="front.png" scale={4} />);
  expect(container.querySelector('img')).toHaveAttribute('width', '192');
});
