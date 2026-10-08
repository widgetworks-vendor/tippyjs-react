// import tippy, {createSingleton} from 'tippy.js/headless';
import tippy, {createSingleton} from '@wiwo/tippyjs/headless.js';
import TippyGenerator from './Tippy.js';
import useSingletonGenerator from './useSingleton.js';
import forwardRef from './forwardRef.js';

const useSingleton = useSingletonGenerator(createSingleton);

export default forwardRef(TippyGenerator(tippy), {render: () => ''});
export {useSingleton, tippy};
