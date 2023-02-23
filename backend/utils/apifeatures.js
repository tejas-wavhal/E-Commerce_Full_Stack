class ApiFeatures {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  search() {
    const keyword = this.queryStr.keyword
      ? {
        name: {
          $regex: this.queryStr.keyword,  //Mongo DB
          $options: "i",  //Mongo DB
        },
      }
      : {};

    this.query = this.query.find({ ...keyword });   //now we will find product even if not full product name given inside find(-> * <-)
    return this;
  }

  filter() {
    const queryCopy = { ...this.queryStr };   //we have pass {...this.queryStr} because if we pass directly {this.queryStr} directly then const queryCopy will not get value of this.queryStr it will get refrence not value that means if we change const queryCopy then it will also change {this.queryStr}. So thats why to avoid this we are using {...this.queryStr} so by getting value by spread operator it will create copy of {this.queryStr} by giving the value like this =>{...this.queryStr}
    // console.log(queryCopy)

    //   Removing some fields for category
    const removeFields = ["keyword", "page", "limit"];
    removeFields.forEach((key) => delete queryCopy[key]);   //only category=samosa will be there not keyword=samosa
    // console.log(queryCopy)

    // Filter For Price and Rating
    let queryStr = JSON.stringify(queryCopy);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (key) => `$${key}`);    //because we need to add $ in front of e.g- gt like ==> ( $gt ) to work greater that in Mongo DB

    this.query = this.query.find(JSON.parse(queryStr));
    // console.log(queryCopy)

    return this;
  }

  pagination(resultPerPage) {
    const currentPage = Number(this.queryStr.page) || 1;

    const skip = resultPerPage * (currentPage - 1);

    this.query = this.query.limit(resultPerPage).skip(skip);

    return this;
  }
}

module.exports = ApiFeatures;
