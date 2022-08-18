import { ObjectId } from 'bson';
import { debounce } from 'debounce';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import FilterButton from '../../components/filterButton';
import Page from '../../components/page';
import Select from '../../components/select';
import Dimensions from '../../constants/dimensions';
import TimeRange from '../../constants/timeRange';
import { AppContext } from '../../contexts/appContext';
import { enrichCollection, enrichLevels } from '../../helpers/enrich';
import filterSelectOptions from '../../helpers/filterSelectOptions';
import naturalSort from '../../helpers/naturalSort';
import usePush from '../../hooks/usePush';
import useUserById from '../../hooks/useUserById';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import Collection from '../../models/db/collection';
import User, { getProfileSlug } from '../../models/db/user';
import LinkInfo from '../../models/linkInfo';
import { CollectionModel, UserModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import { doQuery } from '../api/search';
import { EnrichedCollection, EnrichedLevel, SearchQuery } from '../search';

interface UniverseParams extends ParsedUrlQuery {
  id: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;
  const { id } = context.params as UniverseParams;

  if (!ObjectId.isValid(id)) {
    return { props: {
      error: 'Could not find this user',
      levels: [],
      searchQuery: {},
      total: 0,
    } };
  }

  const universe = await UserModel.findById<User>(id);

  if (!universe) {
    return { props: {
      error: 'Could not find this user',
      levels: [],
      searchQuery: {},
      total: 0,
    } };
  }

  const searchQuery: SearchQuery = {
    sort_by: 'name',
    sort_dir: 'asc',
    time_range: TimeRange[TimeRange.All]
  };

  if (context.query && (Object.keys(context.query).length > 0)) {
    for (const q in context.query as SearchQuery) {
      searchQuery[q] = context.query[q];
    }
  }

  searchQuery.searchAuthorId = universe._id.toString();

  const [collections, query] = await Promise.all([
    CollectionModel.find<Collection>({ userId: id }, 'levels name')
      .populate({
        path: 'levels',
        select: '_id leastMoves',
        match: { isDraft: false },
      })
      .sort({ name: 1 }),
    doQuery(searchQuery, reqUser?._id.toString(), '_id name data leastMoves points width height slug'),
  ]);

  if (!query) {
    throw new Error('Error finding Levels');
  }

  const enrichedCollections = await Promise.all(collections.map(collection => enrichCollection(collection, reqUser)));
  const enrichedLevels = await enrichLevels(query.levels, reqUser);

  return {
    props: {
      collections: JSON.parse(JSON.stringify(enrichedCollections)),
      enrichedLevels: JSON.parse(JSON.stringify(enrichedLevels)),
      searchQuery: searchQuery,
      totalRows: query.totalRows,
      user: JSON.parse(JSON.stringify(reqUser)),
    } as UniversePageProps,
  };
}

interface UniversePageProps {
  collections: Collection[];
  enrichedLevels: EnrichedLevel[];
  searchQuery: SearchQuery;
  totalRows: number;
  user: User;
}

export default function UniversePage({ collections, enrichedLevels, searchQuery, totalRows, user }: UniversePageProps) {
  const [collectionFilterText, setCollectionFilterText] = useState('');
  const firstLoad = useRef(true);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const routerPush = usePush();
  const [searchLevel, setSearchLevel] = useState('');
  const [searchLevelText, setSearchLevelText] = useState('');
  const { setIsLoading } = useContext(AppContext);
  const [showCollectionFilter, setShowCollectionFilter] = useState('');
  const [showLevelFilter, setShowLevelFilter] = useState('');

  const { id } = router.query;
  const universe = useUserById(id).user;
  const [url, setUrl] = useState(router.asPath.substring(1, router.asPath.length));

  useEffect(() => {
    setLoading(false);
  }, [enrichedLevels]);

  useEffect(() => {
    setLoading(true);
    routerPush('/' + url);
  }, [url, routerPush]);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading, setIsLoading]);

  const getCollectionOptions = useCallback(() => {
    if (!collections) {
      return [];
    }

    // sort collections by name but use a natural sort
    const sortedCollections = naturalSort(collections) as EnrichedCollection[];

    return sortedCollections.map((collection: EnrichedCollection) => new SelectOption(
      collection._id.toString(),
      collection.name,
      `/collection/${collection._id.toString()}`,
      new SelectOptionStats(collection.levelCount, collection.userCompletedCount),
    )).filter(option => option.stats?.total);
  }, [collections]);

  const getFilteredCollectionOptions = useCallback(() => {
    return filterSelectOptions(getCollectionOptions(), showCollectionFilter, collectionFilterText);
  }, [collectionFilterText, getCollectionOptions, showCollectionFilter]);

  const getLevelOptions = useCallback(() => {
    if (!universe || !enrichedLevels) {
      return [];
    }

    return enrichedLevels.map((level) => new SelectOption(
      level._id.toString(),
      level.name,
      `/level/${level.slug}`,
      new SelectOptionStats(level.leastMoves, level.userMoves),
      Dimensions.OptionHeightMedium,
      undefined,
      level.points,
      level,
    ));
  }, [enrichedLevels, universe]);

  const fetchLevels = useCallback(async () => {
    if (firstLoad.current) {
      firstLoad.current = false;

      return;
    }

    //firstLoad.current = true;
    // this url but strip any query params
    const url_until_query = url.split('?')[0];
    const routerUrl = url_until_query + '?search=' + encodeURIComponent(searchLevel) + '&show_filter=' + encodeURIComponent(showLevelFilter) + '&page=' + encodeURIComponent(page);

    setUrl(routerUrl);
  }, [page, searchLevel, showLevelFilter, url]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  useEffect(() => {
    setSearchLevel(searchQuery.search || '');
    setSearchLevelText(searchQuery.search || '');
    setShowLevelFilter(searchQuery.show_filter || '');
    setPage(searchQuery.page ? parseInt(searchQuery.page as string) : 1);
  }, [searchQuery]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setSearchLevelQueryVariable = useCallback(
    debounce((name: string) => {
      setSearchLevel(name);
    }, 500),
    []
  );

  useEffect(() => {
    setPage(1);
    setSearchLevelQueryVariable(searchLevelText);
  }, [setSearchLevelQueryVariable, searchLevelText]);

  const onFilterCollectionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setPage(1);
    setShowCollectionFilter(showCollectionFilter === e.currentTarget.value ? 'all' : e.currentTarget.value);
  };
  const onFilterLevelClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setPage(1);
    setShowLevelFilter(showLevelFilter === e.currentTarget.value ? 'all' : e.currentTarget.value);
  };

  return (!universe ? null :
    <Page
      folders={[new LinkInfo('Catalog', '/catalog/all')]}
      title={universe.name}
      titleHref={getProfileSlug(universe)}
    >
      <>
        {getCollectionOptions().length === 0 ? null : <>
          <div className='flex justify-center pt-2'>
            <div className='flex items-center justify-center' role='group'>
              {user && <>
                <FilterButton element={<>{'Hide Won'}</>} first={true} onClick={onFilterCollectionClick} selected={showCollectionFilter === 'hide_won'} value='hide_won' />
                <FilterButton element={<>{'Show In Progress'}</>} last={true} onClick={onFilterCollectionClick} selected={showCollectionFilter === 'only_attempted'} value='only_attempted' />
              </>}
              <div className='p-2'>
                <input type='search' key='search-collections' id='search-collections' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={'Search ' + collections.length + ' collections...'} onChange={e => setCollectionFilterText(e.target.value)} value={collectionFilterText} />
              </div>
            </div>
          </div>
          <div>
            <Select options={getFilteredCollectionOptions()}/>
          </div>
          <div
            style={{
              borderBottom: '1px solid',
              borderColor: 'var(--bg-color-3)',
              margin: '0 auto',
              width: '90%',
            }}
          >
          </div>
        </>}
        <div className='flex justify-center pt-2'>
          <svg className={'animate-spin -ml-1 mr-3 h-5 w-5 text-white ' + (!loading ? 'invisible' : '')} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div className='flex justify-center pt-2'>
          <div className='flex items-center justify-center' role='group'>
            {user && <>
              <FilterButton element={<>{'Hide Won'}</>} first={true} onClick={onFilterLevelClick} selected={showLevelFilter === 'hide_won'} value='hide_won' />
              <FilterButton element={<>{'Show In Progress'}</>} last={true} onClick={onFilterLevelClick} selected={showLevelFilter === 'only_attempted'} value='only_attempted' />
            </>}
            <div className='p-2'>
              <input key={'search_levels'} id='search-levels' type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={'Search ' + totalRows + ' levels...'} onChange={e => setSearchLevelText(e.target.value)} value={searchLevelText} />
            </div>

          </div>
        </div>
        <div className='flex justify-center pt-2'>
          <Link href={'/search?time_range=All&searchAuthor=' + universe.name}><a className='underline'>Advanced search</a></Link>
        </div>
        <div>
          <Select options={getLevelOptions()}/>
        </div>
        {totalRows > 20 &&
        <div className='flex justify-center pt-2 flex-col'>
          <div className='flex justify-center flex-row'>
            { (page > 1) && (
              <button className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')} onClick={() => setPage(page - 1) }>Previous</button>
            )}
            <div id='page-number' className='ml-2'>{page} of {Math.ceil(totalRows / 20)}</div>
            { totalRows > (page * 20) && (
              <button className={'ml-2 ' + (loading ? 'text-gray-300 cursor-default' : 'underline')} onClick={() => setPage(page + 1) }>Next</button>
            )}
          </div>
          <div className='flex justify-center p-3 pb-6'>
            <Link href={'/search?time_range=All&searchAuthor=' + universe.name}><a className='underline'>View rest of {universe.name}&apos;s levels</a></Link>
          </div>
        </div>
        }
      </>
    </Page>
  );
}
