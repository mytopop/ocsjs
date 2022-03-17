import { defaults } from "lodash";
import { DefineComponent, defineComponent, defineCustomElement, h, VNode, VNodeArrayChildren, VNodeProps } from "vue";
import { setItem } from "./store";
/**
 * 创建自定义元素
 */
export function createCustomElement(name: string, element: any) {
    let Element = defineCustomElement(typeof element === "function" ? element() : element);
    const el = customElements.get(name);
    if (el) {
        return new el();
    } else {
        customElements.define(name, Element);
        return new Element();
    }
}

/**
 * 创建提示面板
 */
export function createNote(...notes: string[]) {
    return h(
        "div",
        notes.map((note) => h("p", note))
    );
}

export function createHeaders(children: string | number | boolean | VNode | VNodeArrayChildren) {
    return h(
        "div",
        {
            class: "ocs-panel-header draggable",
        },
        children
    );
}

export function createContainers(children: string | number | boolean | VNode | VNodeArrayChildren) {
    return h(
        "div",
        {
            class: "ocs-panel-container",
        },
        children
    );
}

export function createFooter() {
    return h("div", { class: "ocs-panel-footer" }, "—— OCS网课助手");
}

/**
 * 创建设置面板
 */

export function createSettingPanel(...settingItems: (SettingSelect | SettingInput)[]): DefineComponent {
    return defineComponent({
        render() {
            return h(
                "form",
                {
                    method: "get",
                    action: "/",
                    onSubmit: (e: any) => {
                        e.preventDefault();
                        const refs = this.$refs as any;
                        /** 解析 refs 里面的所有绑定值 */

                        Reflect.ownKeys(refs)
                            .filter((key) => key !== "submit")
                            .flatMap((key) => {
                                const value =
                                    refs[key].type === "checkbox" || refs[key].type === "radio"
                                        ? refs[key].checked
                                        : refs[key].value;
                                setItem(key.toString(), value);
                            });

                        /** 保存到 localStorage */
                        console.log("设置保存");

                        refs.submit.value = "保存成功√";
                        refs.submit.disabled = true;
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    },
                },
                [
                    h(
                        "div",
                        {
                            class: "ocs-setting-items",
                        },
                        settingItems
                            .map((input) => [h("label", input.label), createSettingItem.apply(this, [input])])
                            .flat()
                    ),
                    h(
                        "div",
                        {
                            class: "ocs-setting-buttons",
                            style: {
                                marginTop: "4px",
                            },
                        },
                        [
                            h("input", {
                                type: "reset",
                                value: "重置",
                            }),
                            h("input", {
                                type: "submit",
                                ref: "submit",
                                value: "保存",
                            }),
                        ]
                    ),
                ]
            );
        },
    });
}

export interface SettingItem {
    label: string;
    type: string;
    ref: string;
    icons?: ({
        type: string;
        onClick?: (eL: HTMLElement) => void;
    } & { attrs?: VNodeProps & Record<string, any> })[];
    attrs?: VNodeProps & Record<string, any>;
}

export interface SettingSelect extends SettingItem {
    type: "select";
    options?: { label: string; value: any; attrs?: VNodeProps & Record<string, any> }[];
}

export interface SettingInput extends SettingItem {
    type:
        | "button"
        | "checkbox"
        | "color"
        | "date"
        | "datetime"
        | "datetime-local"
        | "email"
        | "file"
        | "hidden"
        | "image"
        | "month"
        | "number"
        | "password"
        | "radio"
        | "range"
        | "reset"
        | "search"
        | "submit"
        | "tel"
        | "text"
        | "time"
        | "url"
        | "week";
}

/**
 * 创建选择框
 */
function createSettingSelect(input: SettingSelect) {
    return h(
        "select",
        {
            ref: input.ref,
            ...input.attrs,
        },
        input.options?.map((option) =>
            h(
                "option",
                {
                    value: option.value,
                    ...option.attrs,
                },
                option.label
            )
        )
    );
}

/**
 * 创建文本输入框
 */
function createSettingInput(input: SettingInput) {
    return h("input", {
        ref: input.ref,
        type: input.type,
        ...input.attrs,
    });
}

/**
 * 创建设置项
 */
function createSettingItem(input: SettingSelect | SettingInput) {
    return h(
        "div",
        {
            style: {
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
            },
        },
        [
            input.type === "select" ? createSettingSelect(input) : createSettingInput(input),
            input.icons?.map((icon) => {
                icon.attrs = icon.attrs || {};
                icon.attrs.style = defaults(
                    {
                        fontSize: "14px",
                        cursor: "pointer",
                    },
                    icon?.attrs?.style
                );
                return h("i", {
                    class: icon?.type,
                    onClick: () => {
                        // @ts-ignore
                        icon?.onClick?.(this.$refs[input.ref] as HTMLElement);
                    },
                    ...icon?.attrs,
                });
            }),
        ]
    );
}