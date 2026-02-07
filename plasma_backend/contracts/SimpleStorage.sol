// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SimpleStorage {
    string private storedData;
    
    event DataStored(string data);
    
    constructor() {
        storedData = "Hello, Plasma!";
    }
    
    function setData(string memory data) public {
        storedData = data;
        emit DataStored(data);
    }
    
    function getData() public view returns (string memory) {
        return storedData;
    }
}