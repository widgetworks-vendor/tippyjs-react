import type { 
  Content,
  Instance,
  Props,
  ReferenceElement,
  State,
  tippy as tippyFn,
} from '@wiwo/tippyjs';
import {PropsWithChildren} from 'react';
import type {SingletonTarget} from './useSingleton.js';
import type {ReactNode} from 'react';

export type Attrs = {
  placement: State['placement'],
  referenceHidden: boolean,
  escaped: boolean,
}
export type RenderAttrs = {
  'data-placement': State['placement'],
  'data-reference-hidden'?: '';
  'data-escaped'?: '';
};

/*
tippyjs-react render function.
NOTE: this has a different signature to the standard tippyjs render function
*/
export type RenderFn = (
  attrs: RenderAttrs,
  content: ReactNode | Content,
  instance: Instance,
) => ReactNode;
