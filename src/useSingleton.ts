import type {
  createSingleton as createSingletonFn,
  Content,
  CreateSingletonInstance,
  Instance, Props,
} from '@wiwo/tippyjs';
import {useMutableBox, useIsomorphicLayoutEffect} from './util-hooks.js';
import {deepPreserveProps} from './utils.js';
import {classNamePlugin} from './className-plugin.js';
import {useMemo, useState} from 'react';

export type SingletonSource = {
  data: SingletonBox;
  hook(data: any): void;
  cleanup(instance: Instance): void;
};
export type SingletonTarget = {
  hook(data: any);
  cleanup(instance: Instance): void;
};
export type SingletonHookProps = {
  instance: Instance;
  content: Content;
  props: Partial<Props>;
  setSingletonContent: (content: Content) => void;
};
export type SingletonBox = {
  children: SingletonHookProps[];
  renders: number;
  instance: CreateSingletonInstance | null;
  sourceData: SingletonHookProps | null;
  setSingletonContent: ((content: Content) => void) | null;
}

export default function useSingletonGenerator(createSingleton: typeof createSingletonFn) {
  return function useSingleton({disabled = false, overrides = []} = {}) {
    const [mounted, setMounted] = useState(false);
    const mutableBox = useMutableBox<SingletonBox>({
      children: [] as SingletonHookProps[],
      renders: 1,
      instance: null as CreateSingletonInstance | null,
      sourceData: null as SingletonHookProps | null,
      setSingletonContent: null as ((content: Content) => void) | null,
    });

    useIsomorphicLayoutEffect(() => {
      if (!mounted) {
        setMounted(true);
        return;
      }

      const {children, sourceData} = mutableBox;

      if (!sourceData) {
        console.error(
          [
            '@tippyjs/react: The `source` variable from `useSingleton()` has',
            'not been passed to a <Tippy /> component.',
          ].join(' '),
        );
        return;
      }

      const instance = createSingleton(
        children.map(child => child.instance),
        {
          ...sourceData.props,
          popperOptions: sourceData.instance.props.popperOptions,
          overrides,
          plugins: [classNamePlugin, ...(sourceData.props.plugins || [])],
        },
      );

      mutableBox.instance = instance;

      if (disabled) {
        instance.disable();
      }

      return () => {
        instance.destroy();
        mutableBox.children = children.filter(
          ({instance}) => !instance.state.isDestroyed,
        );
      };
    }, [mounted]);

    useIsomorphicLayoutEffect(() => {
      if (!mounted) {
        return;
      }

      if (mutableBox.renders === 1) {
        mutableBox.renders++;
        return;
      }

      const {children, instance, sourceData} = mutableBox;

      if (!(instance && sourceData)) {
        return;
      }

      const {content, ...props} = sourceData.props;

      instance.setProps(
        deepPreserveProps(instance.props, {
          ...props,
          overrides,
        }),
      );

      instance.setInstances(children.map(child => child.instance));

      if (disabled) {
        instance.disable();
      } else {
        instance.enable();
      }
    });

    const singletonTupleResult = useMemo(() => {
      const source: SingletonSource = {
        data: mutableBox,
        hook(data: SingletonHookProps) {
          mutableBox.sourceData = data;
          mutableBox.setSingletonContent = data.setSingletonContent;
        },
        cleanup(instance: Instance) {
          mutableBox.sourceData = null;
        },
      };

      const target: SingletonTarget = {
        hook(data: SingletonHookProps) {
          mutableBox.children = mutableBox.children.filter(
            ({instance}) => data.instance !== instance,
          );
          mutableBox.children.push(data);

          if (
            mutableBox.instance?.state.isMounted &&
            (mutableBox.instance?.state as any).$$activeSingletonInstance ===
              data.instance
          ) {
            mutableBox.setSingletonContent?.(data.content);
          }

          if (mutableBox.instance && !mutableBox.instance.state.isDestroyed) {
            mutableBox.instance.setInstances(
              mutableBox.children.map(child => child.instance),
            );
          }
        },
        cleanup(instance: Instance) {
          mutableBox.children = mutableBox.children.filter(
            data => data.instance !== instance,
          );

          if (mutableBox.instance && !mutableBox.instance.state.isDestroyed) {
            mutableBox.instance.setInstances(
              mutableBox.children.map(child => child.instance),
            );
          }
        },
      };

      return [source, target] as const;
    }, []);
    return singletonTupleResult;
  };
}
