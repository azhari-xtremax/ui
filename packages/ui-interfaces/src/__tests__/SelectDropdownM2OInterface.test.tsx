import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SelectDropdownM2OInterface } from '../select-dropdown-m2o/SelectDropdownM2OInterface';
import type { M2ORelationInfo } from '@buildpad/hooks';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

const relationInfoWithCustomPk: M2ORelationInfo = {
  relatedCollection: { collection: 'articles' },
  foreignKeyField: { field: 'article_id', type: 'uuid' },
  relatedPrimaryKeyField: { field: 'slug', type: 'string' },
};

describe('SelectDropdownM2OInterface (R5.5)', () => {
  it('resolves currentId via the relation-provided PK field, not a hardcoded .id', () => {
    renderWithProvider(
      <SelectDropdownM2OInterface
        collection="posts"
        field="article"
        value={{ slug: 'hello-world', title: 'Hello World' } as any}
        relationInfo={relationInfoWithCustomPk}
        renderSelectedItem={(item) => <span data-testid="rendered-item">{String((item as any)?.slug)}</span>}
      />
    );

    expect(screen.getByTestId('rendered-item')).toHaveTextContent('hello-world');
  });

  it('falls back to "id" when no relationInfo is provided', () => {
    renderWithProvider(
      <SelectDropdownM2OInterface
        collection="posts"
        field="article"
        value={{ id: 'post-1', title: 'Post One' } as any}
        renderSelectedItem={(item) => <span data-testid="rendered-item">{String((item as any)?.id)}</span>}
      />
    );

    expect(screen.getByTestId('rendered-item')).toHaveTextContent('post-1');
  });

  it('wraps a primitive value under the resolved PK field before handing it to renderSelectedItem', () => {
    renderWithProvider(
      <SelectDropdownM2OInterface
        collection="posts"
        field="article"
        value="hello-world"
        relationInfo={relationInfoWithCustomPk}
        renderSelectedItem={(item) => <span data-testid="rendered-item">{JSON.stringify(item)}</span>}
      />
    );

    expect(screen.getByTestId('rendered-item')).toHaveTextContent(JSON.stringify({ slug: 'hello-world' }));
  });
});
