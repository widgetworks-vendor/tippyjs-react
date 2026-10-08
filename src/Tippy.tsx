import * as React from 'react';
import {cloneElement, forwardRef, useState, PropsWithChildren, ReactText, ReactElement} from 'react';
import {createPortal} from 'react-dom';
import type { 
  Content,
  Instance,
  Props,
  ReferenceElement,
  State,
  tippy as tippyFn,
} from '@wiwo/tippyjs';
import {
  preserveRef,
  ssrSafeCreateDiv,
  toDataAttributes,
  deepPreserveProps,
} from './utils.js';
import { 
  Attrs,
  RenderAttrs,
  RenderFn,
} from './types.js';
import {useMutableBox, useIsomorphicLayoutEffect} from './util-hooks.js';
import {classNamePlugin} from './className-plugin.js';
import type {SingletonSource, SingletonTarget} from './useSingleton.js';

export type TippyComponent = ReturnType<typeof TippyGenerator>;

export type TippyProps = PropsWithChildren<Omit<Props, 'content' | 'render'> & {
  visible: boolean;
  
  /*
  CFH: I don't know what the difference is between the source/target singleton objects
  or when you might use one over the other.
  
  The demo site uses both in the `<SingletonHeadless>` example (see `/demo/index.tsx`).
  */
  singleton: SingletonSource | SingletonTarget;
  
  content: React.ReactNode | Content,
  render: RenderFn,
  
  /**
   * The "trigger" element (or "target" element)
   */
  reference: React.MutableRefObject<ReferenceElement>;
  disabled: boolean;
}>;

export default function TippyGenerator(tippy: typeof tippyFn) {
  function Tippy($props: Partial<TippyProps>) {
    let {
      children,
      content,
      visible,
      singleton,
      render,
      reference,
      disabled = false,
      ignoreAttributes = true,
      // Filter React development reserved props
      // added by babel-preset-react dev plugins:
      // transform-react-jsx-self and transform-react-jsx-source
      __source,
      __self,
      ...restOfNativeProps
    } = ($props as Partial<TippyProps> & {__source: any, __self: any});
    
    const isControlledMode = visible !== undefined;
    const isSingletonMode = singleton !== undefined;

    const [mounted, setMounted] = useState(false);
    const [attrs, setAttrs] = useState<Partial<Attrs>>({});
    const [singletonContent, setSingletonContent] = useState<React.ReactNode | Content>();
    const mutableBox = useMutableBox(() => ({
      container: ssrSafeCreateDiv(),
      renders: 1,
      ref: null as ReferenceElement | null,
      instance: null as Instance | null,
    }));

    const props = {
      ignoreAttributes,
      ...restOfNativeProps,
      content: mutableBox.container,
    };

    if (isControlledMode) {
      ['trigger', 'hideOnClick', 'showOnCreate'].forEach(nativeStateProp => {
        if (props[nativeStateProp] !== undefined) {
          console.warn(
            [
              `@tippyjs/react: Cannot specify \`${nativeStateProp}\` prop in`,
              `controlled mode (\`visible\` prop)`,
            ].join(' '),
          );
        }
      });

      props.trigger = 'manual';
      props.hideOnClick = false;
    }

    if (isSingletonMode) {
      disabled = true;
    }

    let computedProps: Partial<Props> = props;
    const plugins = props.plugins || [];

    if (render) {
      let $plugins = [...plugins];
      
      /**
       * Inside here `singleton: SingletonSource`
       */
      if (isSingletonMode && 'data' in singleton && singleton.data != null){
        const singletonPlugin = {
          fn() {
            return {
              onTrigger(instance, event) {
                const node = singleton.data.children.find(
                  ({instance}) =>
                    instance.reference === event.currentTarget,
                );
                (instance.state as any).$$activeSingletonInstance = node.instance;
                setSingletonContent(node.content);
              },
            };
          },
        };
        
        $plugins.push(singletonPlugin);
      }
      
      computedProps = {
        ...props,
        plugins: $plugins,
        render: () => ({popper: mutableBox.container}),
      };
    }

    const deps: any[] = [].concat(
      reference,
      children ? [(children as ReactElement).type] : []
    );

    // CREATE
    useIsomorphicLayoutEffect(() => {
      let element = reference as unknown as ReferenceElement;
      if (reference && 'current' in reference) {
        element = reference.current;
      }
      
      const tippyElement = element || mutableBox.ref || ssrSafeCreateDiv();
      const tippyProps = {
        ...computedProps,
        plugins: [classNamePlugin, ...(props.plugins || [])],
      };
      const instance = tippy(tippyElement, tippyProps) as Instance;

      mutableBox.instance = instance;

      if (disabled) {
        instance.disable();
      }

      if (visible) {
        instance.show();
      }

      if (isSingletonMode) {
        singleton.hook({
          instance,
          content,
          props: computedProps,
          setSingletonContent,
        });
      }

      setMounted(true);

      return () => {
        instance.destroy();
        singleton?.cleanup(instance);
      };
    }, deps);

    // UPDATE
    useIsomorphicLayoutEffect(() => {
      // Prevent this effect from running on 1st render
      if (mutableBox.renders === 1) {
        mutableBox.renders++;
        return;
      }

      const {instance} = mutableBox;

      instance.setProps(deepPreserveProps(instance.props, computedProps));

      // Fixes #264
      instance.popperInstance?.forceUpdate();

      if (disabled) {
        instance.disable();
      } else {
        instance.enable();
      }

      if (isControlledMode) {
        if (visible) {
          instance.show();
        } else {
          instance.hide();
        }
      }

      if (isSingletonMode) {
        singleton.hook({
          instance,
          content,
          props: computedProps,
          setSingletonContent,
        });
      }
    });

    useIsomorphicLayoutEffect(() => {
      if (!render) {
        return;
      }

      const {instance} = mutableBox;

      instance.setProps({
        popperOptions: {
          ...instance.props.popperOptions,
          modifiers: [
            ...(instance.props.popperOptions?.modifiers || []).filter(
              ({name}) => name !== '$$tippyReact',
            ),
            {
              name: '$$tippyReact',
              enabled: true,
              phase: 'beforeWrite',
              requires: ['computeStyles'],
              fn({state}) {
                const hideData = state.modifiersData?.hide;

                // WARNING: this is a high-risk path that can cause an infinite
                // loop. This expression _must_ evaluate to false when required
                if (
                  attrs.placement !== state.placement ||
                  attrs.referenceHidden !== hideData?.isReferenceHidden ||
                  attrs.escaped !== hideData?.hasPopperEscaped
                ) {
                  setAttrs({
                    placement: state.placement,
                    referenceHidden: hideData?.isReferenceHidden,
                    escaped: hideData?.hasPopperEscaped,
                  });
                }

                state.attributes.popper = {};
              },
            },
          ],
        },
      });
    }, [attrs.placement, attrs.referenceHidden, attrs.escaped, ...deps]);

    return (
      <>
        {children
          ? cloneElement((children as ReactElement), {
              ref(node) {
                mutableBox.ref = node;
                preserveRef((children as any).ref, node);
              },
            })
          : null}
        {mounted &&
          createPortal(
            render
              ? render(
                  toDataAttributes(attrs),
                  singletonContent,
                  mutableBox.instance,
                )
              : content,
            mutableBox.container,
          )}
      </>
    );
  }

  return Tippy;
}
