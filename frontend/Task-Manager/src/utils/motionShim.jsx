import React from "react";

const createMotionComponent = (Tag) =>
  React.forwardRef(({ children, ...props }, ref) => (
    <Tag ref={ref} {...props}>
      {children}
    </Tag>
  ));

export const motion = {
  div: createMotionComponent("div"),
  button: createMotionComponent("button"),
  aside: createMotionComponent("aside"),
  main: createMotionComponent("main"),
};

export const AnimatePresence = ({ children }) => <>{children}</>;
