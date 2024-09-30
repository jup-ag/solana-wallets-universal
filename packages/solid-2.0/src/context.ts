// @see https://github.com/solidjs-community/solid-primitives/blob/main/packages/context/src/index.ts
import { JSX, createContext, createComponent, useContext } from "solid-js"

export type ContextProviderProps = {
  children?: JSX.Element
} & Record<string, unknown>
export type ContextProvider<T extends ContextProviderProps> = (
  props: { children: JSX.Element } & T,
) => JSX.Element

/**
 * Create the Context Provider component and useContext function with types inferred from the factory function.
 * @param factoryFn Factory function will run when the provider component in executed. It takes the provider component `props` as it's argument, and what it returns will be available in the contexts for all the underlying components.
 * @param defaults fallback returned from useContext function if the context wasn't provided
 * @returns tuple of `[provider component, useContext function]`
 * @example
 * ```tsx
 * const [CounterProvider, useCounter] = createContextProvider((props: { initial: number }) => {
 *    const [count, setCount] = createSignal(props.initial);
 *    const increment = () => setCount(count() + 1)
 *    return { count, increment };
 * });
 * // Provide the context
 * <CounterProvider initial={1}>
 *    <App/>
 * </CounterProvider>
 * // get the context
 * const ctx = useCounter()
 * ctx?.count() // => 1
 * ```
 */
export function createContextProvider<T, P extends ContextProviderProps>(
  factoryFn: (props: P) => T,
  defaults: T,
): [provider: ContextProvider<P>, useContext: () => T]
export function createContextProvider<T, P extends ContextProviderProps>(
  factoryFn: (props: P) => T,
): [provider: ContextProvider<P>, useContext: () => T | undefined]
export function createContextProvider<T, P extends ContextProviderProps>(
  factoryFn: (props: P) => T,
  defaults?: T,
): [provider: ContextProvider<P>, useContext: () => T | undefined] {
  const ctx = createContext(defaults)
  return [
    props => {
      return createComponent(ctx.Provider, {
        value: factoryFn(props),
        get children() {
          return props.children
        },
      })
    },
    () => useContext(ctx),
  ]
}
