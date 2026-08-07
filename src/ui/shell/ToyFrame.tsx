import type { ReactNode } from "react";

interface ToyFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ToyFrame({ eyebrow, title, description, actions, children, className = "" }: ToyFrameProps) {
  return (
    <div className={`toy-frame ${className}`}>
      <div className="toy-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions ? <div className="toy-actions">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
