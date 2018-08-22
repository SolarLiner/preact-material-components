import {MDCRipple} from '@material/ripple';
import autobind from 'autobind-decorator';
import {Component, VNode} from 'preact';
import MDCComponent from '../../node_modules/@types/material__base/component';
import {OmitAttrs} from './types';

export interface IMaterialComponentOwnProps {
  ripple?: boolean;
}

export interface IMaterialComponentOwnState {}

type MaterialComponentProps<PropType> = PropType &
  IMaterialComponentOwnProps &
  OmitAttrs<JSX.HTMLAttributes, PropType>;

type MaterialComponentState<StateType> = StateType & IMaterialComponentOwnState;

const doNotRemoveProps = ['disabled'];

/**
 * Base class for every Material component in this package
 * NOTE: every component should add a ref by the name of `control` to its root dom for autoInit Properties
 *
 * @export
 * @class MaterialComponent
 * @extends {Component}
 */
export abstract class MaterialComponent<
  PropType extends {[prop: string]: any},
  StateType extends {[prop: string]: any}
> extends Component<
  MaterialComponentProps<PropType>,
  MaterialComponentState<StateType>
> {
  /**
   * Attributes inside this array will be check for boolean value true
   * and will be converted to mdc classes
   */
  protected abstract mdcProps: string[];
  /** This will again be used to add apt classname to the component */
  protected abstract componentName: string;

  /**
   * Props of which change the MDComponent will be informed.
   * Override to use.
   * When used do not forget to include this.afterComponentDidMount() at the end of your componentDidMount function.
   * Requires this.MDComponent to be defined.
   */
  protected mdcNotifyProps?: string[];

  /** The final class name given to the dom */
  protected classText?: string | null;
  protected ripple?: MDCRipple | null;
  protected control?: Element;
  protected MDComponent?: MDCComponent<any, any>;

  public render(props): VNode {
    if (!this.classText) {
      this.classText = this.buildClassName();
    }
    // Fetch a VNode
    const componentProps = props;
    const userDefinedClasses =
      componentProps.className || componentProps.class || '';

    // We delete class props and add them later in the final
    // step so every component does not need to handle user specified classes.
    if (componentProps.class) {
      delete componentProps.class;
    }
    if (componentProps.className) {
      delete componentProps.className;
    }

    const element = this.materialDom(componentProps);
    element.attributes = element.attributes || {};

    element.attributes.className = `${userDefinedClasses} ${this.getClassName(
      element
    )}`
      .split(' ')
      .filter(
        (value, index, self) => self.indexOf(value) === index && value !== ''
      ) // Unique + exclude empty class names
      .join(' ');
    // Clean this shit of proxy attributes
    this.mdcProps.forEach(prop => {
      // TODO: Fix this better
      if (prop in doNotRemoveProps) {
        return;
      }
      delete element.attributes[prop];
    });
    return element;
  }

  /** Attach the ripple effect */
  public componentDidMount() {
    if (this.props.ripple && this.control) {
      this.ripple = new MDCRipple(this.control);
    }
  }

  public componentWillUpdate(nextProps: PropType) {
    if (this.MDComponent && this.mdcNotifyProps) {
      for (const prop of this.mdcNotifyProps) {
        if (this.props[prop] !== nextProps[prop]) {
          this.MDComponent[prop as string] = nextProps[prop];
        }
      }
    }
    for (const prop of this.mdcProps) {
      if (this.props[prop] !== nextProps[prop]) {
        this.classText = this.buildClassName();
        break;
      }
    }
  }

  public componentWillUnmount() {
    if (this.ripple) {
      this.ripple.destroy();
    }
  }

  @autobind
  protected afterComponentDidMount() {
    if (this.MDComponent && this.mdcNotifyProps) {
      for (const prop of this.mdcNotifyProps) {
        this.MDComponent[prop as string] = this.props[prop];
      }
    }
  }

  // Shared setter for the root element ref
  @autobind
  protected setControlRef(control?: Element) {
    this.control = control;
  }

  /** Build the className based on component names and mdc props */
  @autobind
  protected buildClassName() {
    // Class name based on component name
    let classText = 'mdc-' + this.componentName;

    // Loop over mdcProps to turn them into classNames
    for (const propKey in this.props) {
      if (this.props.hasOwnProperty(propKey)) {
        const prop = this.props[propKey];
        if (typeof prop === 'boolean' && prop) {
          if (this.mdcProps.indexOf(propKey) !== -1) {
            classText += ` mdc-${this.componentName}--${propKey}`;
          }
        }
      }
    }

    return classText;
  }

  /** Returns the class name for element */
  @autobind
  protected getClassName(element: VNode) {
    if (!element) {
      return '';
    }
    const attrs = (element.attributes = element.attributes || {});
    let classText = this.classText;
    if (attrs.class) {
      classText += ' ' + attrs.class;
    }
    if (attrs.className && attrs.className !== attrs.class) {
      classText += ' ' + attrs.className;
    }
    return classText;
  }

  /** Components must implement this method for their specific DOM structure */
  protected abstract materialDom(
    props: MaterialComponentProps<PropType>
  ): VNode;
}

export default MaterialComponent;
