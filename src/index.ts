// import tippy, {createSingleton} from 'tippy.js';
import tippy, {createSingleton} from '@wiwo/tippyjs';
import type * as React from 'react';
import type {Ref} from 'react';
import TippyGenerator, {type TippyProps} from './Tippy.js';
import useSingletonGenerator from './useSingleton.js';
import forwardRef from './forwardRef.js';

const useSingleton = useSingletonGenerator(createSingleton);

const Tippy = TippyGenerator(tippy)
const TippyDefault/*: React.ComponentType<Partial<TippyProps & {ref?: Ref<any>}>>*/ = forwardRef(Tippy);
export default TippyDefault;
export {useSingleton, tippy};
