import * as React from 'react';
import {cloneElement, forwardRef} from 'react';
import type { 
  TippyComponent,
  TippyProps,
} from './Tippy.js';
import {preserveRef} from './utils.js';

export default (Tippy: TippyComponent, defaultProps?: Partial<TippyProps>) =>
  forwardRef<unknown, Partial<TippyProps>>(function TippyWrapper(_props: Partial<TippyProps>, ref) {
    const {children, ...props} = _props;
    return (
      // If I spread them separately here, Babel adds the _extends ponyfill for
      // some reason
      <Tippy {...{...defaultProps, ...props}}>
        {children
          ? cloneElement(children, {
              ref(node) {
                preserveRef(ref, node);
                preserveRef(children.ref, node);
              },
            })
          : null}
      </Tippy>
    );
  });
