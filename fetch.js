
async function getData() {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts');
        const data = await response.json();
        
        const filteredData = data.filter(item => item.id <= 20);
        return filteredData;
    } catch (error) {
        console.error(error);
    }
}

export default getData;
