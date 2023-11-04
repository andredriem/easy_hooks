/**
 * In this file we will teach on how to handle errors in the periodic hook and 
 * in all hooks generated in this library.
 */
import React from 'react';
import { generatePeriodicHook } from '../src/hook_builder'

type User = {
    id: number;
    name: string;
    email: string;
    friendsOnline: number;
};

// We will now create two new types of data based on the server data.
// UserStaticData will contain the data that will not change over time
// and UserDinaicData will contain the data that will change over time.
type UserStaticData = {
    name: string;
    email: string;
};

type UserDinaicData = {
    friendsOnline: number;
};

type UserError = {
    message: string;
};

function isUserData(data: unknown): data is User {
    /** 
     * We will implement a simple validation function to check if the data is a valid user
     * but we recommend using third-party libaries for that. Plese check the section
     * "Data Integrity" in the README.md file for more information.
     */

    if (typeof data !== 'object' || data === null) {
        return false;
    }

    if(Object.keys(data).length !== 4) {
        return false;
    }

    if (typeof (data as User).id !== 'number') {
        return false;
    }

    if (typeof (data as User).name !== 'string') {
        return false;
    }

    if (typeof (data as User).email !== 'string') {
        return false;
    }

    if (typeof (data as User).friendsOnline !== 'number') {
        return false;
    }

    return true;

}



const generatorResponse = generatePeriodicHook<User, UserError> (
    // First we will set the fetch user function
    async (userId, notifyObservers) => {

        let response: null | unknown = null;

        // In this example we will use a try/catch block to notify the components if any
        // error happens during the fetching of the user data.
        try {
            response = await fetch('https://example.com/api/user/' + userId);
        } catch (error) {
            // We will notify the observers with the error
            notifyObservers(null, {message: 'There was an error fetching the user data'});
            return;
        }

        if(isUserData(response)) {
            notifyObservers(response, null);
        else{
            // We will notify the observers with the error
            notifyObservers(null, {message: 'The response sent by the server is not valid'});
        }
    }, 
    5000, // Then we will set the interval to 5 seconds

)

// Now we don't want to create a useUser hook because we want to use the whole user data in any components in this 
// example. So we will create a useUserStaticData and a useUserDynamicData hooks.

// We will create now a simple useUserStaticData
const useUserStaticData = generatorResponse.stateCompresser<UserDinaicData>((oldUser, user, notifyObservers) => {
    if ( user === null) return null;

    // We will return the static data
    return {
        name: user.name,
        email: user.email
    }
});