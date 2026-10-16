import type { ReactNode } from "react";

interface ComposerToolbarProps {
  title: string;
  identity?: ReactNode;
  data?: ReactNode;
  filters?: ReactNode;
  board?: ReactNode;
  persist?: ReactNode;
  actions: ReactNode;
}

export function ComposerToolbar({
  title,
  identity,
  data,
  filters,
  board,
  persist,
  actions,
}: ComposerToolbarProps) {
  return (
    <header className="sc-toolbar">
      <div className="sc-toolbar__body">
        <div className="sc-toolbar__pinned">
          <div className="sc-toolbar__row sc-toolbar__row--primary">
            <div className="sc-toolbar__brand">
              <p className="sc-toolbar__eyebrow">Compose only</p>
              <h1 className="sc-toolbar__title">{title}</h1>
            </div>
            {identity ? (
              <div
                className="sc-toolbar__slot sc-toolbar__identity"
                data-slot="Title"
                role="group"
                aria-label="Title"
              >
                {identity}
              </div>
            ) : null}
          </div>
          {data ? (
            <div
              className="sc-toolbar__row sc-toolbar__row--data sc-toolbar__slot sc-toolbar__data"
              data-slot="Data"
              role="group"
              aria-label="Data"
            >
              {data}
            </div>
          ) : null}
          {filters ? (
            <div
              className="sc-toolbar__row sc-toolbar__row--filters sc-toolbar__slot sc-toolbar__filters"
              data-slot="Filters"
              role="group"
              aria-label="Filters"
            >
              {filters}
            </div>
          ) : null}
        </div>
        <div className="sc-toolbar__scroll">
          {board ? (
            <div
              className="sc-toolbar__row sc-toolbar__row--board sc-toolbar__slot sc-toolbar__board"
              data-slot="Board"
              role="group"
              aria-label="Board"
            >
              {board}
            </div>
          ) : null}
          {persist ? (
            <div
              className="sc-toolbar__row sc-toolbar__row--persist sc-toolbar__slot sc-toolbar__persist"
              data-slot="Save"
              role="group"
              aria-label="Save"
            >
              {persist}
            </div>
          ) : null}
        </div>
      </div>
      <div
        className="sc-toolbar__row sc-toolbar__row--actions sc-toolbar__actions"
        data-slot="Export"
        role="group"
        aria-label="Export"
      >
        {actions}
      </div>
    </header>
  );
}
