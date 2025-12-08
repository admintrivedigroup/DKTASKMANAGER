import React from "react";

const createMotionComponent = (Tag) =>
  React.forwardRef(
    (
      {
        children,
        // Strip motion-only props so they don't end up on DOM nodes
        initial,
        animate,
        exit,
        whileHover,
        whileTap,
        transition,
        variants,
        layout,
        layoutId,
        ...props
      },
      ref
    ) => (
      <Tag ref={ref} {...props}>
        {children}
      </Tag>
    )
  );

export const motion = {
  div: createMotionComponent("div"),
  button: createMotionComponent("button"),
  aside: createMotionComponent("aside"),
  main: createMotionComponent("main"),
};

export const AnimatePresence = ({ children }) => <>{children}</>;
