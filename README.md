# Easy Hooks

Easy Hooks is an efficient, powerful React Hook library designed to facilitate seamless data fetching and state management in React applications. This library centers on the Single Source of Truth (SSOT) pattern, ensuring that all components using the same parameters receive data from the same source, thereby enhancing data consistency and synchronization across your application. As a result, Easy Hooks encourages you to write DRY (Don't Repeat Yourself), efficient, and maintainable code.

## Key Features

### Superior Efficiency

Easy Hooks employs an efficient approach to data fetching and state management. By adopting the Single Source of Truth (SSOT) pattern, it ensures that multiple components using the same parameters fetch data from the same source. This means that even with numerous components requesting the same data, only one network request is sent, improving the performance of your application.

### Smart Data Management

Easy Hooks automatically handles the lifecycle of data fetching based on the lifecycle of your components. Data fetching begins when the first component mounts and stops when the last component using the data unmounts. This way, Easy Hooks optimizes network usage and ensures data is always fresh and synchronized across your components.

### Versatility

Easy Hooks provides a range of hooks to cater to different data fetching scenarios. Whether you're fetching data once, polling an API periodically, or managing a real-time connection using WebSockets with ActionCable, Easy Hooks has you covered.

### Customizable Hooks

For those unique cases that don't fit into the provided hooks, Easy Hooks offers the `generateHook` function. This function allows you to implement your own data fetching and stopping logic, granting you the flexibility you need for your specific use cases.

### Safe and Secure

Easy Hooks empowers developers to implement data safety measures at the hook level. The library doesn't enforce any specific security measures, thus giving you the freedom to apply the best data safety practices that fit your project's needs.

## Key Considerations

Before using Easy Hooks, it's important to consider the following:

1. **Type Checking**: When implementing your fetching and stopping logic, make sure to correctly check your types. This is crucial for ensuring that your application behaves as expected.

2. **Error Handling**: Ensure that you handle errors in your API and networking logic effectively. You should generate your corresponding error objects to provide meaningful error information for your hooks.

## Installation

To install Easy Hooks, use npm or yarn:

```bash
npm install easy_hooks
# OR
yarn add easy_hooks
```

## Usage

### generatePeriodicHook

`generatePeriodicHook` creates a hook that fetches data at a specified interval. This is ideal for polling APIs or simulating real-time updates.

```jsx
import { generatePeriodicHook } from 'easy_hooks';

// Example fetch function
async function fetchData(parameters: string, notifyObservers: (data: Data | ErrorData, isData: boolean) => void): Promise<void> {
    const response = await fetch(`https://api.example.com/data?params=${parameters}`);
    const data = await response.json();
    notifyObservers(data, true);
}

const useMyData = generatePeriodicHook(fetchData, 5000); // Fetches data every 5 seconds

// Later in a component
const [data, error, componentId] = useMyData('my-parameters');
```

### actionCableHook

`actionCableHook` creates a hook that fetches data in real-time using ActionCable. This is perfect when you want to keep your data in sync with a real-time server.

```jsx
import { actionCableHook } from 'easy_hooks';

const useMyData = actionCableHook('MyChannel');

// Later in a component
const [data, error, componentId] = useMyData('my-parameters');
```

### generateHook

`generateHook` is the most flexible function, allowing you to provide your own data fetching and stopping logic. This is particularly useful for handling specific cases that the other hooks don't cater to.

```jsx
import { generateHook } from 'easy_hooks';

// Your fetch function
async function fetchData(parameters: string, notifyObservers: (data: Data | ErrorData, isData: boolean) => void): Promise<void> {
    // Your data fetching logic
}

// Your stop fetching function
function stopFetching(parameters: string): Promise<void> {
    // Your logic to stop fetching data
}

const useMyData = generateHook(fetchData, stopFetching);

// Later in a component
const [data, error, componentId] = useMyData('my-parameters');
```

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

Enjoy using Easy Hooks!